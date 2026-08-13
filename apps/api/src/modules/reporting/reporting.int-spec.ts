import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, ProductStatus, ProductType } from '@prisma/client';
import { subDays } from 'date-fns';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { CacheModule } from '../../shared/infrastructure/cache/cache.module';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { STORAGE_UPLOADER, StorageUploader } from '../../shared/infrastructure/storage/storage-uploader.port';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { OrderNumber } from '../ordering/domain/value-objects/order-number.vo';
import { ReportingModule } from './reporting.module';
import { DashboardSummaryService } from './application/services/dashboard-summary.service';

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
// dashboard summary only ever reads storeId/buyerId/total/fee/status/paidAt
// off the order, same precedent as ledger.int-spec.ts's createOrderRow.
const createOrderRow = async (
  prisma: PrismaService,
  params: {
    storeId: string;
    buyerId: string;
    total: bigint;
    feeAmount?: bigint;
    status: OrderStatus;
    paidAt: Date | null;
  },
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
      platformFeeAmount: params.feeAmount ?? 0n,
      paidAt: params.paidAt,
      releasedAt: params.status === OrderStatus.released ? (params.paidAt ?? new Date()) : null,
      createdAt: params.paidAt ?? new Date(),
    },
  });
  return id;
};

const createProductRow = async (
  prisma: PrismaService,
  params: { storeId: string; status: ProductStatus },
) => {
  const id = generateId();
  await prisma.product.create({
    data: {
      id,
      storeId: params.storeId,
      name: 'Test Product',
      slug: `test-product-${id}`,
      price: 10_000n,
      productType: ProductType.digital,
      status: params.status,
    },
  });
  return id;
};

const createBankAccountRow = async (prisma: PrismaService, storeId: string) => {
  const id = generateId();
  await prisma.bankAccount.create({
    data: {
      id,
      storeId,
      bankCode: 'bca',
      bankName: 'BCA',
      accountNumber: '1234567890',
      accountHolderName: 'Test Seller',
      isDefault: true,
    },
  });
  return id;
};

describe('Reporting (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let dashboardSummary: DashboardSummaryService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        PrismaModule,
        RedisModule,
        CacheModule,
        EventsModule,
        StorageModule,
        StoreModule,
        ReportingModule,
      ],
    })
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    dashboardSummary = moduleRef.get(DashboardSummaryService);
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

  it('buckets revenue/orders/buyers into today, 7d, and 30d, and excludes refunded orders', async () => {
    const seller = await createUser(prisma, 'reporting-seller1@example.com', 'seller');
    const buyer1 = await createUser(prisma, 'reporting-buyer1@example.com', 'buyer');
    const buyer2 = await createUser(prisma, 'reporting-buyer2@example.com', 'buyer');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'reportstore1' })).unwrap();

    const now = new Date();

    // Today: 1 order, 1 buyer, 100_000
    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer1.id,
      total: 100_000n,
      status: OrderStatus.paid,
      paidAt: now,
    });
    // 3 days ago: within 7d and 30d, not today
    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer2.id,
      total: 50_000n,
      status: OrderStatus.holding,
      paidAt: subDays(now, 3),
    });
    // 20 days ago: within 30d only
    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer1.id,
      total: 30_000n,
      status: OrderStatus.released,
      paidAt: subDays(now, 20),
    });
    // Refunded today — must never count anywhere
    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer1.id,
      total: 999_000n,
      status: OrderStatus.refunded,
      paidAt: now,
    });

    const summary = await dashboardSummary.getSummary(store.id);

    expect(summary.today).toEqual({ revenue: '100000', orders: 1, buyers: 1 });
    expect(summary.last7Days).toEqual({ revenue: '150000', orders: 2, buyers: 2 });
    expect(summary.last30Days).toEqual({ revenue: '180000', orders: 3, buyers: 2 });
  });

  it('pendingRelease sums total minus platform_fee_amount over holding orders only', async () => {
    const seller = await createUser(prisma, 'reporting-seller2@example.com', 'seller');
    const buyer = await createUser(prisma, 'reporting-buyer3@example.com', 'buyer');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'reportstore2' })).unwrap();

    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer.id,
      total: 200_000n,
      feeAmount: 10_000n,
      status: OrderStatus.holding,
      paidAt: new Date(),
    });
    // Already released — must not count toward pendingRelease
    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer.id,
      total: 500_000n,
      feeAmount: 25_000n,
      status: OrderStatus.paid,
      paidAt: new Date(),
    });

    const summary = await dashboardSummary.getSummary(store.id);

    expect(summary.pendingRelease).toEqual({ count: 1, amount: '190000' });
  });

  it('onboarding flags flip exactly when their precondition is met, one at a time', async () => {
    const seller = await createUser(prisma, 'reporting-seller3@example.com', 'seller');
    const buyer = await createUser(prisma, 'reporting-buyer4@example.com', 'buyer');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'reportstore3' })).unwrap();

    const initial = await dashboardSummary.getSummary(store.id);
    expect(initial.onboarding).toEqual({
      hasProfile: false,
      hasPublishedProduct: false,
      hasBankAccount: false,
      hasFirstSale: false,
    });

    await prisma.store.update({
      where: { id: store.id },
      data: { avatarUrl: 'https://fake.local/avatar.png', bio: 'Toko contoh' },
    });
    const afterProfile = await dashboardSummary.getSummary(store.id);
    expect(afterProfile.onboarding).toEqual({
      hasProfile: true,
      hasPublishedProduct: false,
      hasBankAccount: false,
      hasFirstSale: false,
    });

    await createProductRow(prisma, { storeId: store.id, status: ProductStatus.draft });
    const withOnlyDraft = await dashboardSummary.getSummary(store.id);
    expect(withOnlyDraft.onboarding.hasPublishedProduct).toBe(false);

    await createProductRow(prisma, { storeId: store.id, status: ProductStatus.active });
    const afterProduct = await dashboardSummary.getSummary(store.id);
    expect(afterProduct.onboarding).toEqual({
      hasProfile: true,
      hasPublishedProduct: true,
      hasBankAccount: false,
      hasFirstSale: false,
    });

    await createBankAccountRow(prisma, store.id);
    const afterBank = await dashboardSummary.getSummary(store.id);
    expect(afterBank.onboarding).toEqual({
      hasProfile: true,
      hasPublishedProduct: true,
      hasBankAccount: true,
      hasFirstSale: false,
    });

    await createOrderRow(prisma, {
      storeId: store.id,
      buyerId: buyer.id,
      total: 75_000n,
      status: OrderStatus.paid,
      paidAt: new Date(),
    });
    const afterSale = await dashboardSummary.getSummary(store.id);
    expect(afterSale.onboarding).toEqual({
      hasProfile: true,
      hasPublishedProduct: true,
      hasBankAccount: true,
      hasFirstSale: true,
    });
  });

  it('never leaks another store’s orders, products, or bank accounts into a store’s own summary', async () => {
    const sellerA = await createUser(prisma, 'reporting-sellerA@example.com', 'seller');
    const sellerB = await createUser(prisma, 'reporting-sellerB@example.com', 'seller');
    const buyer = await createUser(prisma, 'reporting-buyer5@example.com', 'buyer');
    const storeA = (await storeService.createStore({ ownerId: sellerA.id, username: 'reportstorea' })).unwrap();
    const storeB = (await storeService.createStore({ ownerId: sellerB.id, username: 'reportstoreb' })).unwrap();

    await createOrderRow(prisma, {
      storeId: storeB.id,
      buyerId: buyer.id,
      total: 1_000_000n,
      status: OrderStatus.paid,
      paidAt: new Date(),
    });
    await createProductRow(prisma, { storeId: storeB.id, status: ProductStatus.active });
    await createBankAccountRow(prisma, storeB.id);

    const summaryA = await dashboardSummary.getSummary(storeA.id);

    expect(summaryA.today).toEqual({ revenue: '0', orders: 0, buyers: 0 });
    expect(summaryA.last30Days).toEqual({ revenue: '0', orders: 0, buyers: 0 });
    expect(summaryA.pendingRelease).toEqual({ count: 0, amount: '0' });
    expect(summaryA.onboarding).toEqual({
      hasProfile: false,
      hasPublishedProduct: false,
      hasBankAccount: false,
      hasFirstSale: false,
    });
  });
});
