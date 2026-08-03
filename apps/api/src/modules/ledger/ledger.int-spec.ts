import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
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
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrderingModule } from '../ordering/ordering.module';
import { OrderNumber } from '../ordering/domain/value-objects/order-number.vo';
import { LedgerModule } from './ledger.module';
import { LedgerService } from './application/services/ledger.service';

const fakeStorageUploader: StorageUploader = {
  isConfigured: () => true,
  checkConnection: async () => undefined,
  upload: async ({ path }) => ({ path, url: `https://fake.local/${path}` }),
  remove: async () => undefined,
  createSignedUrl: async ({ path }) => `https://fake.local/signed/${path}`,
  download: async () => Buffer.from('fake'),
};

const createUser = async (prisma: PrismaService, email: string, role: 'seller' | 'buyer') =>
  prisma.user.create({
    data: {
      id: generateId(),
      email,
      name: role === 'seller' ? 'Test Seller' : 'Test Buyer',
      role,
      emailVerifiedAt: new Date(),
      passwordHash: 'irrelevant-for-this-test',
    },
  });

// Orders are inserted directly rather than run through checkout — the
// ledger only ever reads storeId/total/fee/status off the order, so this
// keeps the suite focused on the ledger's own invariants.
const createOrderRow = async (
  prisma: PrismaService,
  params: { storeId: string; buyerId: string; total: bigint; feeAmount: bigint; status: OrderStatus },
) => {
  const id = generateId();
  await prisma.order.create({
    data: {
      id,
      orderNumber: OrderNumber.generate().value,
      storeId: params.storeId,
      buyerId: params.buyerId,
      source: 'self_checkout',
      status: params.status,
      subtotal: params.total,
      discountAmount: 0n,
      total: params.total,
      platformFeeRate: '0.05',
      platformFeeAmount: params.feeAmount,
      paidAt: new Date(),
      createdAt: new Date(),
    },
  });
  return id;
};

describe('Ledger (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let ledgerService: LedgerService;

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
    ledgerService = moduleRef.get(LedgerService);
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

  it('ledger invariants: cached balance matches SUM(deltas) and the snapshot chain is gapless', async () => {
    const seller = await createUser(prisma, 'ledger-seller1@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoledger1' })).unwrap();
    const buyer = await createUser(prisma, 'ledger-buyer1@example.com', 'buyer');
    const orderId = await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer.id,
      total: 100_000n,
      feeAmount: 5_000n,
      status: 'paid',
    });

    const credited = await ledgerService.creditHoldingForOrder(orderId);
    expect(credited.isOk()).toBe(true);

    await prisma.order.update({ where: { id: orderId }, data: { status: 'released', releasedAt: new Date() } });
    const released = await ledgerService.releaseToAvailableForOrder(orderId);
    expect(released.isOk()).toBe(true);

    const rows = await prisma.balanceTransaction.findMany({
      where: { storeId: store.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(rows).toHaveLength(2);

    // Nothing is ever updated or deleted — row count only grows.
    const sumHolding = rows.reduce((acc, row) => acc + row.holdingDelta, 0n);
    const sumAvailable = rows.reduce((acc, row) => acc + row.availableDelta, 0n);

    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.holdingBalance).toBe(sumHolding);
    expect(storeRow.availableBalance).toBe(sumAvailable);

    let runningHolding = 0n;
    let runningAvailable = 0n;
    for (const row of rows) {
      runningHolding += row.holdingDelta;
      runningAvailable += row.availableDelta;
      expect(row.holdingBalanceAfter).toBe(runningHolding);
      expect(row.availableBalanceAfter).toBe(runningAvailable);
    }
    expect(runningHolding).toBe(0n);
    expect(runningAvailable).toBe(95_000n);
  });

  it('replay safety: crediting the same order twice produces exactly one ledger row', async () => {
    const seller = await createUser(prisma, 'ledger-seller2@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoledger2' })).unwrap();
    const buyer = await createUser(prisma, 'ledger-buyer2@example.com', 'buyer');
    const orderId = await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer.id,
      total: 50_000n,
      feeAmount: 2_500n,
      status: 'paid',
    });

    await ledgerService.creditHoldingForOrder(orderId);
    await ledgerService.creditHoldingForOrder(orderId);

    const count = await prisma.balanceTransaction.count({ where: { orderId, type: 'order_paid_holding' } });
    expect(count).toBe(1);
    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.holdingBalance).toBe(47_500n);
  });

  // The test the FOR UPDATE lock on the stores row exists for: without it,
  // "read balance, then write balance" races under concurrent credits and
  // silently loses updates.
  it('balance concurrency: parallel credits and releases on one store produce a correct final balance', async () => {
    const seller = await createUser(prisma, 'ledger-seller3@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoledger3' })).unwrap();
    const buyer = await createUser(prisma, 'ledger-buyer3@example.com', 'buyer');

    const orderCount = 10;
    const orderIds: string[] = [];
    for (let i = 0; i < orderCount; i += 1) {
      const id = await createOrderRow(prisma, {
        storeId: store.id,
        buyerId: buyer.id,
        total: 10_000n,
        feeAmount: 500n,
        status: 'paid',
      });
      orderIds.push(id);
    }

    const netPerOrder = 9_500n;
    await Promise.all(orderIds.map((id) => ledgerService.creditHoldingForOrder(id)));

    const afterCredit = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(afterCredit.holdingBalance).toBe(netPerOrder * BigInt(orderCount));
    expect(afterCredit.availableBalance).toBe(0n);

    const toRelease = orderIds.slice(0, 5);
    await prisma.order.updateMany({
      where: { id: { in: toRelease } },
      data: { status: 'released', releasedAt: new Date() },
    });
    await Promise.all(toRelease.map((id) => ledgerService.releaseToAvailableForOrder(id)));

    const totalRows = await prisma.balanceTransaction.count({ where: { storeId: store.id } });
    expect(totalRows).toBe(orderCount + toRelease.length);

    const finalStore = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(finalStore.holdingBalance).toBe(netPerOrder * BigInt(orderCount - toRelease.length));
    expect(finalStore.availableBalance).toBe(netPerOrder * BigInt(toRelease.length));
  });
});
