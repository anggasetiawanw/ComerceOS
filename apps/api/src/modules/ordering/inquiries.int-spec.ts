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
import { ProductService } from '../catalog/application/services/product.service';
import { IdentityModule } from '../identity/identity.module';
import { PaymentsModule } from '../payments/payments.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { OrderingModule } from './ordering.module';
import { CreateInquiryService } from './application/services/create-inquiry.service';
import { ConvertInquiryService } from './application/services/convert-inquiry.service';
import { MarkInquiryLostService } from './application/services/mark-inquiry-lost.service';
import { INQUIRY_REPOSITORY, InquiryRepository } from './domain/repositories/inquiry.repository';

const fakeStorageUploader: StorageUploader = {
  isConfigured: () => true,
  checkConnection: async () => undefined,
  upload: async ({ path }) => ({ path, url: `https://fake.local/${path}` }),
  remove: async () => undefined,
  createSignedUrl: async ({ path }) => `https://fake.local/signed/${path}`,
  download: async () => Buffer.from('fake'),
};

const createUser = async (prisma: PrismaService, email: string, role: 'seller' | 'buyer' = 'seller') =>
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

describe('Inquiries (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let productService: ProductService;
  let createInquiry: CreateInquiryService;
  let convertInquiry: ConvertInquiryService;
  let markInquiryLost: MarkInquiryLostService;
  let inquiries: InquiryRepository;

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
        DeliveryModule,
      ],
    })
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    productService = moduleRef.get(ProductService);
    createInquiry = moduleRef.get(CreateInquiryService);
    convertInquiry = moduleRef.get(ConvertInquiryService);
    markInquiryLost = moduleRef.get(MarkInquiryLostService);
    inquiries = moduleRef.get(INQUIRY_REPOSITORY);
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

  const setUp = async (params: { sellerEmail: string; username: string; withWhatsapp?: boolean }) => {
    const seller = await createUser(prisma, params.sellerEmail);
    const store = (await storeService.createStore({ ownerId: seller.id, username: params.username })).unwrap();
    if (params.withWhatsapp) {
      await storeService.updateProfile(seller.id, { whatsappNumber: '08123456789' });
    }
    const product = (
      await productService.create(store.id, store.ownerId, { name: 'Kaos Custom', price: '150000', productType: 'physical' })
    ).unwrap();
    await productService.publish(store.id, store.ownerId, product.id);
    return { seller, store, product };
  };

  it('creates an anonymous inquiry with no waLink when the store has no whatsapp number', async () => {
    const { store, product } = await setUp({ sellerEmail: 'seller-a@example.com', username: 'tokoinquiry1' });

    const result = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-1',
    });

    expect(result.isOk()).toBe(true);
    const { inquiryId, waLink } = result.unwrap();
    expect(waLink).toBeNull();

    const row = await inquiries.findById(inquiryId);
    expect(row?.status.value).toBe('open');
    expect(row?.buyerId).toBeNull();
    expect(row?.storeId).toBe(store.id);
  });

  it('returns a wa.me link with a prefilled message once the store has a whatsapp number', async () => {
    const { store, product } = await setUp({
      sellerEmail: 'seller-b@example.com',
      username: 'tokoinquiry2',
      withWhatsapp: true,
    });

    const result = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-2',
    });

    const { waLink } = result.unwrap();
    expect(waLink).toContain('https://wa.me/628123456789');
    expect(decodeURIComponent(waLink ?? '')).toContain('Kaos Custom');
  });

  it('dedupes a second inquiry from the same store/product/token within the window', async () => {
    const { store, product } = await setUp({ sellerEmail: 'seller-c@example.com', username: 'tokoinquiry3' });

    const first = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-3',
    });
    const second = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-3',
    });

    expect(first.unwrap().inquiryId).toBe(second.unwrap().inquiryId);
    const count = await prisma.inquiry.count({ where: { storeId: store.id } });
    expect(count).toBe(1);
  });

  it('records a real buyerId when the visitor is logged in', async () => {
    const { store, product } = await setUp({ sellerEmail: 'seller-d@example.com', username: 'tokoinquiry4' });
    const buyer = await createUser(prisma, 'buyer-d@example.com', 'buyer');

    const result = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: buyer.id,
      dedupToken: buyer.id,
    });

    const row = await inquiries.findById(result.unwrap().inquiryId);
    expect(row?.buyerId).toBe(buyer.id);
  });

  it('converts an open inquiry into a manual order and marks it converted', async () => {
    const { seller, store, product } = await setUp({ sellerEmail: 'seller-e@example.com', username: 'tokoinquiry5' });
    const created = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-5',
    });
    const inquiryId = created.unwrap().inquiryId;

    const result = await convertInquiry.execute(inquiryId, seller.id, {
      expectedStoreId: store.id,
      items: [{ productId: product.id, qty: 1 }],
      buyerEmail: 'walkin@example.com',
      buyerName: 'Walk-in Buyer',
      buyerPhone: null,
    });

    expect(result.isOk()).toBe(true);
    const order = result.unwrap();
    expect(order.source.value).toBe('manual');
    expect(order.inquiryId).toBe(inquiryId);

    const inquiryRow = await inquiries.findById(inquiryId);
    expect(inquiryRow?.status.value).toBe('converted');
    expect(inquiryRow?.convertedOrderId).toBe(order.id);

    const orderRow = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderRow?.inquiryId).toBe(inquiryId);
  });

  it('rejects converting the same inquiry twice', async () => {
    const { seller, store, product } = await setUp({ sellerEmail: 'seller-f@example.com', username: 'tokoinquiry6' });
    const created = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-6',
    });
    const inquiryId = created.unwrap().inquiryId;

    const convertParams = {
      expectedStoreId: store.id,
      items: [{ productId: product.id, qty: 1 }],
      buyerEmail: 'walkin@example.com',
      buyerName: 'Walk-in Buyer',
      buyerPhone: null,
    };
    const first = await convertInquiry.execute(inquiryId, seller.id, convertParams);
    expect(first.isOk()).toBe(true);

    const second = await convertInquiry.execute(inquiryId, seller.id, convertParams);
    expect(second.isErr()).toBe(true);
    expect(second.unwrapErr().constructor.name).toBe('InquiryAlreadyConvertedError');
  });

  it('marks an inquiry lost, then rejects converting it', async () => {
    const { seller, store, product } = await setUp({ sellerEmail: 'seller-g@example.com', username: 'tokoinquiry7' });
    const created = await createInquiry.execute({
      username: store.username.value,
      productId: product.id,
      buyerId: null,
      dedupToken: 'ip-7',
    });
    const inquiryId = created.unwrap().inquiryId;

    const lostResult = await markInquiryLost.execute(inquiryId, store.id);
    expect(lostResult.isOk()).toBe(true);
    expect(lostResult.unwrap().status.value).toBe('lost');

    const convertResult = await convertInquiry.execute(inquiryId, seller.id, {
      expectedStoreId: store.id,
      items: [{ productId: product.id, qty: 1 }],
      buyerEmail: 'walkin@example.com',
      buyerName: 'Walk-in Buyer',
      buyerPhone: null,
    });
    expect(convertResult.isErr()).toBe(true);
    expect(convertResult.unwrapErr().constructor.name).toBe('InquiryAlreadyLostError');
  });

  it('returns not-found for an inquiry belonging to a different store', async () => {
    const { store: storeA } = await setUp({ sellerEmail: 'seller-h@example.com', username: 'tokoinquiry8a' });
    const { seller: sellerB, store: storeB, product: productB } = await setUp({
      sellerEmail: 'seller-i@example.com',
      username: 'tokoinquiry8b',
    });
    const created = await createInquiry.execute({
      username: storeA.username.value,
      productId: null,
      buyerId: null,
      dedupToken: 'ip-8',
    });
    const inquiryId = created.unwrap().inquiryId;

    const convertResult = await convertInquiry.execute(inquiryId, sellerB.id, {
      expectedStoreId: storeB.id,
      items: [{ productId: productB.id, qty: 1 }],
      buyerEmail: 'walkin@example.com',
      buyerName: 'Walk-in Buyer',
      buyerPhone: null,
    });
    expect(convertResult.isErr()).toBe(true);
    expect(convertResult.unwrapErr().constructor.name).toBe('InquiryNotFoundError');

    const lostResult = await markInquiryLost.execute(inquiryId, storeB.id);
    expect(lostResult.isErr()).toBe(true);
    expect(lostResult.unwrapErr().constructor.name).toBe('InquiryNotFoundError');
  });
});
