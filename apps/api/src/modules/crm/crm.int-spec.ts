import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { CacheModule } from '../../shared/infrastructure/cache/cache.module';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { AppJwtModule } from '../../shared/security/jwt.module';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { OrderNumber } from '../ordering/domain/value-objects/order-number.vo';
import { CrmModule } from './crm.module';
import { StoreBuyerService } from './application/services/store-buyer.service';

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

const createPaidOrderRow = async (prisma: PrismaService, params: { storeId: string; buyerId: string; total: bigint }) => {
  const id = generateId();
  await prisma.order.create({
    data: {
      id,
      orderNumber: OrderNumber.generate().value,
      storeId: params.storeId,
      buyerId: params.buyerId,
      source: 'self_checkout',
      status: 'paid',
      subtotal: params.total,
      discountAmount: 0n,
      total: params.total,
      platformFeeRate: '0.05',
      platformFeeAmount: params.total / 20n,
      paidAt: new Date(),
      createdAt: new Date(),
    },
  });
  return id;
};

describe('CRM (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let storeBuyerService: StoreBuyerService;

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
        StoreModule,
        CrmModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    storeBuyerService = moduleRef.get(StoreBuyerService);
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
    await prisma.inquiry.deleteMany();
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

  it('CRM replay safety: a redelivered OrderPaid does not inflate totals, and notes/tags survive the replay', async () => {
    const seller = await createUser(prisma, 'crm-seller1@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokocrm1' })).unwrap();
    const buyer = await createUser(prisma, 'crm-buyer1@example.com', 'buyer');
    await createPaidOrderRow(prisma, { storeId: store.id, buyerId: buyer.id, total: 100_000n });

    // Simulates the same OrderPaid event delivered 3 times.
    await storeBuyerService.upsertFromPaidOrder(store.id, buyer.id);
    await storeBuyerService.upsertFromPaidOrder(store.id, buyer.id);
    await storeBuyerService.upsertFromPaidOrder(store.id, buyer.id);

    const afterReplay = await prisma.storeBuyer.findUniqueOrThrow({
      where: { storeId_buyerId: { storeId: store.id, buyerId: buyer.id } },
    });
    expect(afterReplay.totalOrders).toBe(1);
    expect(afterReplay.totalSpent).toBe(100_000n);

    // A second real order recomputes to 2 orders / summed spend.
    await createPaidOrderRow(prisma, { storeId: store.id, buyerId: buyer.id, total: 50_000n });
    await storeBuyerService.upsertFromPaidOrder(store.id, buyer.id);

    const afterSecondOrder = await prisma.storeBuyer.findUniqueOrThrow({
      where: { storeId_buyerId: { storeId: store.id, buyerId: buyer.id } },
    });
    expect(afterSecondOrder.totalOrders).toBe(2);
    expect(afterSecondOrder.totalSpent).toBe(150_000n);

    // Seller-entered notes/tags must survive a further replay.
    await prisma.storeBuyer.update({
      where: { storeId_buyerId: { storeId: store.id, buyerId: buyer.id } },
      data: { notes: 'Pelanggan setia', tags: ['vip'] },
    });
    await storeBuyerService.upsertFromPaidOrder(store.id, buyer.id);

    const afterNotesReplay = await prisma.storeBuyer.findUniqueOrThrow({
      where: { storeId_buyerId: { storeId: store.id, buyerId: buyer.id } },
    });
    expect(afterNotesReplay.notes).toBe('Pelanggan setia');
    expect(afterNotesReplay.tags).toEqual(['vip']);
    expect(afterNotesReplay.totalOrders).toBe(2);
  });

  it('cross-store isolation: a buyer purchasing in two stores gets an independent projection per store', async () => {
    const sellerA = await createUser(prisma, 'crm-sellerA@example.com', 'seller');
    const sellerB = await createUser(prisma, 'crm-sellerB@example.com', 'seller');
    const storeA = (await storeService.createStore({ ownerId: sellerA.id, username: 'tokocrmA' })).unwrap();
    const storeB = (await storeService.createStore({ ownerId: sellerB.id, username: 'tokocrmB' })).unwrap();
    const buyer = await createUser(prisma, 'crm-buyer-cross@example.com', 'buyer');

    await createPaidOrderRow(prisma, { storeId: storeA.id, buyerId: buyer.id, total: 100_000n });
    await createPaidOrderRow(prisma, { storeId: storeB.id, buyerId: buyer.id, total: 999_000n });
    await storeBuyerService.upsertFromPaidOrder(storeA.id, buyer.id);
    await storeBuyerService.upsertFromPaidOrder(storeB.id, buyer.id);

    const { rows } = await storeBuyerService.list({ storeId: storeA.id, sort: 'recent', limit: 20 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalSpent).toBe('100000');
  });
});
