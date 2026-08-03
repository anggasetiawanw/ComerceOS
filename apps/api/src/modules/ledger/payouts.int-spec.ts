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
import { IdempotencyService } from '../../shared/infrastructure/idempotency/idempotency.service';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrderingModule } from '../ordering/ordering.module';
import { PaymentsModule } from '../payments/payments.module';
import { LedgerModule } from './ledger.module';
import { BankAccountService } from './application/services/bank-account.service';
import { WithdrawalService } from './application/services/withdrawal.service';
import {
  BankAccountInUseError,
  InsufficientWithdrawableBalanceError,
  PendingWithdrawalExistsError,
} from './domain/errors/ledger.errors';

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
      name: 'Test Seller',
      role,
      emailVerifiedAt: new Date(),
      passwordHash: 'irrelevant-for-this-test',
    },
  });

describe('Payouts (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let bankAccounts: BankAccountService;
  let withdrawals: WithdrawalService;
  let idempotencyService: IdempotencyService;

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
      ],
    })
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    bankAccounts = moduleRef.get(BankAccountService);
    withdrawals = moduleRef.get(WithdrawalService);
    idempotencyService = moduleRef.get(IdempotencyService);
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

  const setUpStoreWithBalance = async (params: { email: string; username: string; available: bigint }) => {
    const seller = await createUser(prisma, params.email, 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: params.username })).unwrap();
    await prisma.store.update({ where: { id: store.id }, data: { availableBalance: params.available } });
    const bankAccount = (
      await bankAccounts.add(store.id, seller.id, {
        bankCode: 'bca',
        accountNumber: '1234567890',
        accountHolderName: 'Seller One',
      })
    ).unwrap();
    return { seller, store, bankAccount };
  };

  it('concurrency: two concurrent requests for the same available balance — exactly one succeeds', async () => {
    const { seller, store } = await setUpStoreWithBalance({
      email: 'payout-seller1@example.com',
      username: 'tokopayout1',
      available: 100_000n,
    });

    const [first, second] = await Promise.all([
      withdrawals.request(store.id, seller.id, 100_000n),
      withdrawals.request(store.id, seller.id, 100_000n),
    ]);

    const results = [first, second];
    const succeeded = results.filter((result) => result.isOk());
    const failed = results.filter((result) => result.isErr());

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.unwrapErr()).toBeInstanceOf(PendingWithdrawalExistsError);

    const count = await prisma.withdrawal.count({ where: { storeId: store.id } });
    expect(count).toBe(1);
  });

  it('pending reservation: a second request while one is already requested is rejected', async () => {
    const { seller, store } = await setUpStoreWithBalance({
      email: 'payout-seller2@example.com',
      username: 'tokopayout2',
      available: 200_000n,
    });

    const first = await withdrawals.request(store.id, seller.id, 100_000n);
    expect(first.isOk()).toBe(true);

    const second = await withdrawals.request(store.id, seller.id, 50_000n);
    expect(second.isErr()).toBe(true);
    expect(second.unwrapErr()).toBeInstanceOf(PendingWithdrawalExistsError);
  });

  it('rejects a request above the withdrawable balance', async () => {
    const { seller, store } = await setUpStoreWithBalance({
      email: 'payout-seller3@example.com',
      username: 'tokopayout3',
      available: 50_000n,
    });

    const result = await withdrawals.request(store.id, seller.id, 100_000n);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBeInstanceOf(InsufficientWithdrawableBalanceError);
  });

  it('request -> approve -> mark-paid debits available by exactly the amount with a gapless snapshot chain', async () => {
    const { seller, store } = await setUpStoreWithBalance({
      email: 'payout-seller4@example.com',
      username: 'tokopayout4',
      available: 150_000n,
    });
    const admin = await createUser(prisma, 'payout-admin4@example.com', 'admin');

    const requested = (await withdrawals.request(store.id, seller.id, 100_000n)).unwrap();
    const approved = await withdrawals.approve(requested.id, admin.id);
    expect(approved.isOk()).toBe(true);

    const paid = await withdrawals.markPaid(requested.id, admin.id);
    expect(paid.isOk()).toBe(true);
    expect(paid.unwrap().status.value).toBe('paid');

    const ledgerRows = await prisma.balanceTransaction.findMany({
      where: { withdrawalId: requested.id },
    });
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0]!.type).toBe('withdrawal_paid');
    expect(ledgerRows[0]!.availableDelta).toBe(-100_000n);
    expect(ledgerRows[0]!.availableBalanceAfter).toBe(50_000n);

    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.availableBalance).toBe(50_000n);

    const auditActions = await prisma.auditLog.findMany({
      where: { entityType: 'withdrawal', entityId: requested.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(auditActions.map((row) => row.action)).toEqual([
      'withdrawal.requested',
      'withdrawal.approved',
      'withdrawal.paid',
    ]);
  });

  it('a second mark-paid call on an already-paid withdrawal is rejected and produces no second ledger row', async () => {
    const { seller, store } = await setUpStoreWithBalance({
      email: 'payout-seller5@example.com',
      username: 'tokopayout5',
      available: 100_000n,
    });
    const admin = await createUser(prisma, 'payout-admin5@example.com', 'admin');

    const requested = (await withdrawals.request(store.id, seller.id, 100_000n)).unwrap();
    await withdrawals.approve(requested.id, admin.id);
    const first = await withdrawals.markPaid(requested.id, admin.id);
    const second = await withdrawals.markPaid(requested.id, admin.id);

    expect(first.isOk()).toBe(true);
    expect(second.isErr()).toBe(true);

    const ledgerRows = await prisma.balanceTransaction.count({ where: { withdrawalId: requested.id } });
    expect(ledgerRows).toBe(1);

    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.availableBalance).toBe(0n);
  });

  it('reject leaves the balance untouched with zero ledger rows', async () => {
    const { seller, store } = await setUpStoreWithBalance({
      email: 'payout-seller6@example.com',
      username: 'tokopayout6',
      available: 100_000n,
    });
    const admin = await createUser(prisma, 'payout-admin6@example.com', 'admin');

    const requested = (await withdrawals.request(store.id, seller.id, 100_000n)).unwrap();
    const rejected = await withdrawals.reject(requested.id, admin.id, 'akun mencurigakan');

    expect(rejected.isOk()).toBe(true);
    expect(rejected.unwrap().status.value).toBe('rejected');

    const ledgerRows = await prisma.balanceTransaction.count({ where: { withdrawalId: requested.id } });
    expect(ledgerRows).toBe(0);

    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.availableBalance).toBe(100_000n);
  });

  describe('idempotency (POST /withdrawals)', () => {
    it('replays the stored response for the same key and body', async () => {
      const key = 'withdrawal-idem-1';
      const userId = generateId();
      const hash = IdempotencyService.hashBody({ amount: 100_000 });

      const first = await idempotencyService.begin(key, userId, 'POST /withdrawals', hash);
      expect(first.kind).toBe('proceed');
      if (first.kind === 'proceed') {
        await idempotencyService.complete(first.recordId, 201, { id: 'withdrawal-1' });
      }

      const replay = await idempotencyService.begin(key, userId, 'POST /withdrawals', hash);
      expect(replay.kind).toBe('replay');
      if (replay.kind === 'replay') {
        expect(replay.status).toBe(201);
        expect(replay.body).toEqual({ id: 'withdrawal-1' });
      }
    });

    it('rejects the same key with a different body as a conflict', async () => {
      const key = 'withdrawal-idem-2';
      const userId = generateId();
      const hashA = IdempotencyService.hashBody({ amount: 100_000 });
      const hashB = IdempotencyService.hashBody({ amount: 200_000 });

      const first = await idempotencyService.begin(key, userId, 'POST /withdrawals', hashA);
      if (first.kind === 'proceed') {
        await idempotencyService.complete(first.recordId, 201, { id: 'withdrawal-1' });
      }

      await expect(idempotencyService.begin(key, userId, 'POST /withdrawals', hashB)).rejects.toThrow();
    });
  });

  describe('bank accounts', () => {
    it('concurrent setDefault calls leave exactly one default account', async () => {
      const seller = await createUser(prisma, 'payout-seller7@example.com', 'seller');
      const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokopayout7' })).unwrap();

      const first = (
        await bankAccounts.add(store.id, seller.id, {
          bankCode: 'bca',
          accountNumber: '1111111111',
          accountHolderName: 'Seller One',
        })
      ).unwrap();
      const second = (
        await bankAccounts.add(store.id, seller.id, {
          bankCode: 'bni',
          accountNumber: '2222222222',
          accountHolderName: 'Seller One',
        })
      ).unwrap();

      // One of the two may lose to the partial unique index
      // (bank_accounts_one_default_per_store) rather than the application
      // layer — allSettled tolerates that instead of the whole test
      // crashing on an unhandled rejection.
      await Promise.allSettled([
        bankAccounts.setDefault(store.id, seller.id, first.id),
        bankAccounts.setDefault(store.id, seller.id, second.id),
      ]);

      const defaults = await prisma.bankAccount.count({ where: { storeId: store.id, isDefault: true } });
      expect(defaults).toBe(1);
    });

    it('refuses to remove a bank account referenced by a pending withdrawal', async () => {
      const { seller, store, bankAccount } = await setUpStoreWithBalance({
        email: 'payout-seller8@example.com',
        username: 'tokopayout8',
        available: 100_000n,
      });
      await withdrawals.request(store.id, seller.id, 100_000n);

      const result = await bankAccounts.remove(store.id, seller.id, bankAccount.id);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(BankAccountInUseError);
    });
  });
});
