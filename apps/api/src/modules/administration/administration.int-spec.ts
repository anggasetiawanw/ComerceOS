import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { CacheModule } from '../../shared/infrastructure/cache/cache.module';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { STORAGE_UPLOADER, StorageUploader } from '../../shared/infrastructure/storage/storage-uploader.port';
import { AppJwtModule } from '../../shared/security/jwt.module';
import { IdempotencyModule } from '../../shared/infrastructure/idempotency/idempotency.module';
import { ROLES_KEY } from '../../shared/presentation/decorators/roles.decorator';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrderingModule } from '../ordering/ordering.module';
import { PaymentsModule } from '../payments/payments.module';
import { LedgerModule } from '../ledger/ledger.module';
import { BankAccountService } from '../ledger/application/services/bank-account.service';
import { WithdrawalService } from '../ledger/application/services/withdrawal.service';
import { AdministrationModule } from './administration.module';
import { AdminWithdrawalService } from './application/services/admin-withdrawal.service';
import { AuditService } from './application/services/audit.service';
import { AdminWithdrawalsController } from './presentation/http/admin-withdrawals.controller';
import { AdminMetricsController } from './presentation/http/admin-metrics.controller';
import { AdminAuditController } from './presentation/http/admin-audit.controller';

const fakeStorageUploader: StorageUploader = {
  isConfigured: () => true,
  checkConnection: async () => undefined,
  upload: async ({ path }) => ({ path, url: `https://fake.local/${path}` }),
  remove: async () => undefined,
  createSignedUrl: async ({ path }) => `https://fake.local/signed/${path}`,
  download: async () => Buffer.from('fake'),
};

const createUser = async (prisma: PrismaService, email: string, role: 'seller' | 'admin') =>
  prisma.user.create({
    data: {
      id: generateId(),
      email,
      name: 'Test User',
      role,
      emailVerifiedAt: new Date(),
      passwordHash: 'irrelevant-for-this-test',
    },
  });

// Every /admin/* controller requiring @Roles('admin') is the wiring
// RolesGuard depends on (RolesGuard's own decision logic is already
// unit-tested exhaustively in roles.guard.spec.ts — this proves the
// decorator is actually present on every admin controller, which a guard
// unit test cannot catch on its own).
describe('Administration — RBAC wiring', () => {
  const reflector = new Reflector();

  it.each([
    ['AdminWithdrawalsController', AdminWithdrawalsController],
    ['AdminMetricsController', AdminMetricsController],
    ['AdminAuditController', AdminAuditController],
  ] as const)(
    '%s requires the admin role',
    (_name, controller) => {
      const roles = reflector.get<string[]>(ROLES_KEY, controller);
      expect(roles).toEqual(['admin']);
    },
  );
});

describe('Administration (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let bankAccounts: BankAccountService;
  let withdrawals: WithdrawalService;
  let adminWithdrawals: AdminWithdrawalService;
  let auditService: AuditService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        PrismaModule,
        RedisModule,
        CacheModule,
        EventsModule,
        StorageModule,
        AppJwtModule,
        IdempotencyModule,
        StoreModule,
        CatalogModule,
        IdentityModule,
        OrderingModule,
        PaymentsModule,
        LedgerModule,
        AdministrationModule,
      ],
    })
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    bankAccounts = moduleRef.get(BankAccountService);
    withdrawals = moduleRef.get(WithdrawalService);
    adminWithdrawals = moduleRef.get(AdminWithdrawalService);
    auditService = moduleRef.get(AuditService);
  });

  beforeEach(async () => {
    await prisma.notificationDelivery.deleteMany();
    await prisma.balanceTransaction.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.storeBuyer.deleteMany();
    await prisma.digitalDelivery.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.digitalFile.deleteMany();
    await prisma.product.deleteMany();
    await prisma.socialLink.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.store.deleteMany();
    await prisma.user.deleteMany();

    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.flushdb();
  });

  afterAll(async () => {
    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.quit();
    await moduleRef.close();
  });

  it('an admin action is always actor_type "admin", never "user" — the support-vs-compromise distinction', async () => {
    const seller = await createUser(prisma, 'admin-seller1@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoadmin1' })).unwrap();
    await prisma.store.update({ where: { id: store.id }, data: { availableBalance: 100_000n } });
    await bankAccounts.add(store.id, seller.id, {
      bankCode: 'bca',
      accountNumber: '1234567890',
      accountHolderName: 'Seller One',
    });
    const admin = await createUser(prisma, 'admin-user1@example.com', 'admin');

    const requested = (await withdrawals.request(store.id, seller.id, 100_000n)).unwrap();
    await adminWithdrawals.approve(requested.id, admin.id);
    await adminWithdrawals.markPaid(requested.id, admin.id);

    const rows = await prisma.auditLog.findMany({
      where: { entityType: 'withdrawal', entityId: requested.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows.map((row) => [row.action, row.actorType])).toEqual([
      ['withdrawal.requested', 'user'],
      ['withdrawal.approved', 'admin'],
      ['withdrawal.paid', 'admin'],
    ]);
    expect(rows.every((row) => row.actorId === admin.id || row.actorId === seller.id)).toBe(true);
  });

  it('the audit write and the withdrawal transition commit atomically — a failed transition writes no audit row', async () => {
    const seller = await createUser(prisma, 'admin-seller2@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoadmin2' })).unwrap();
    await prisma.store.update({ where: { id: store.id }, data: { availableBalance: 100_000n } });
    await bankAccounts.add(store.id, seller.id, {
      bankCode: 'bca',
      accountNumber: '1234567890',
      accountHolderName: 'Seller One',
    });
    const admin = await createUser(prisma, 'admin-user2@example.com', 'admin');

    const requested = (await withdrawals.request(store.id, seller.id, 100_000n)).unwrap();

    // markPaid before approve is an illegal transition — the transaction
    // must produce zero audit rows, not a partial one.
    const result = await adminWithdrawals.markPaid(requested.id, admin.id);
    expect(result.isErr()).toBe(true);

    const rows = await auditService.list({ entityType: 'withdrawal', limit: 20 });
    const forThisWithdrawal = rows.rows.filter((row) => row.entityId === requested.id);
    expect(forThisWithdrawal.map((row) => row.action)).toEqual(['withdrawal.requested']);
  });

  // Regression: listForAdmin's raw SQL compared a plain text parameter
  // against the native WithdrawalStatus enum column, which Postgres
  // rejects with "operator does not exist" — only ever exercised via a
  // live HTTP call with ?status=, never by a direct listQueue() call
  // without a status filter, which is why this shipped past every other
  // test in the suite and was only caught by the live smoke test.
  it('the admin queue status filter does not throw a Postgres enum/text comparison error', async () => {
    const seller = await createUser(prisma, 'admin-seller3@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoadmin3' })).unwrap();
    await prisma.store.update({ where: { id: store.id }, data: { availableBalance: 100_000n } });
    await bankAccounts.add(store.id, seller.id, {
      bankCode: 'bca',
      accountNumber: '1234567890',
      accountHolderName: 'Seller One',
    });
    const requested = (await withdrawals.request(store.id, seller.id, 100_000n)).unwrap();

    const { rows } = await adminWithdrawals.listQueue({ status: 'requested', limit: 20 });

    expect(rows.some((row) => row.id === requested.id)).toBe(true);
  });
});
