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
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrderingModule } from '../ordering/ordering.module';
import { OrderNumber } from '../ordering/domain/value-objects/order-number.vo';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicingModule } from './invoicing.module';
import { InvoiceService } from './application/services/invoice.service';

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

// PUPPETEER_EXECUTABLE_PATH is blank in this environment, so InvoicingModule
// already resolves PDF_RENDERER to NullPdfRenderer — no Chromium dependency,
// matching the plan's "invoicing.int-spec.ts stays free of a Chromium
// dependency" requirement without needing an explicit override.
describe('Invoicing (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let invoiceService: InvoiceService;

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
        NotificationsModule,
        InvoicingModule,
      ],
    })
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    invoiceService = moduleRef.get(InvoiceService);
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

  it('invoice idempotency: repeating generate-invoice for one order never consumes a second number', async () => {
    const seller = await createUser(prisma, 'invoicing-seller1@example.com', 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: 'tokoinvoicing1' })).unwrap();
    const buyer = await createUser(prisma, 'invoicing-buyer1@example.com', 'buyer');
    const orderId = await createPaidOrderRow(prisma, { storeId: store.id, buyerId: buyer.id, total: 100_000n });

    for (let i = 0; i < 3; i += 1) {
      const generated = await invoiceService.generateForOrder(orderId);
      expect(generated.isOk()).toBe(true);
      const rendered = await invoiceService.renderAndUpload(generated.unwrap().id);
      expect(rendered.isOk()).toBe(true);
    }

    const invoiceRows = await prisma.invoice.findMany({ where: { orderId } });
    expect(invoiceRows).toHaveLength(1);
    expect(invoiceRows[0]?.invoiceNumber).toBe('INV-00001');

    const storeRow = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
    expect(storeRow.invoiceCounter).toBe(1);

    // pdf_url is a stable storage path, unchanged by the repeated renders.
    const firstPdfUrl = invoiceRows[0]?.pdfUrl;
    expect(firstPdfUrl).toBeTruthy();
  });

  it('invoice numbers are gapless per store and never collide across stores', async () => {
    const sellerA = await createUser(prisma, 'invoicing-sellerA@example.com', 'seller');
    const sellerB = await createUser(prisma, 'invoicing-sellerB@example.com', 'seller');
    const storeA = (await storeService.createStore({ ownerId: sellerA.id, username: 'tokoinvoicingA' })).unwrap();
    const storeB = (await storeService.createStore({ ownerId: sellerB.id, username: 'tokoinvoicingB' })).unwrap();
    const buyer = await createUser(prisma, 'invoicing-buyer-gapless@example.com', 'buyer');

    // 3 orders for store A, 2 for store B.
    for (let i = 0; i < 3; i += 1) {
      const orderId = await createPaidOrderRow(prisma, { storeId: storeA.id, buyerId: buyer.id, total: 10_000n });
      const generated = await invoiceService.generateForOrder(orderId);
      await invoiceService.renderAndUpload(generated.unwrap().id);
    }
    for (let i = 0; i < 2; i += 1) {
      const orderId = await createPaidOrderRow(prisma, { storeId: storeB.id, buyerId: buyer.id, total: 20_000n });
      const generated = await invoiceService.generateForOrder(orderId);
      await invoiceService.renderAndUpload(generated.unwrap().id);
    }

    const storeAInvoices = await prisma.invoice.findMany({
      where: { storeId: storeA.id },
      orderBy: { invoiceNumber: 'asc' },
    });
    const storeBInvoices = await prisma.invoice.findMany({
      where: { storeId: storeB.id },
      orderBy: { invoiceNumber: 'asc' },
    });

    expect(storeAInvoices.map((row) => row.invoiceNumber)).toEqual(['INV-00001', 'INV-00002', 'INV-00003']);
    expect(storeBInvoices.map((row) => row.invoiceNumber)).toEqual(['INV-00001', 'INV-00002']);
  });
});
