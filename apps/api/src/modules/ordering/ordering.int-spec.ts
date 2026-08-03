import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { AppConfigService } from '../../shared/config/app-config.service';
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
import { OutboxRepository } from '../../shared/infrastructure/outbox/outbox.repository';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ProductService } from '../catalog/application/services/product.service';
import { DigitalFileService } from '../catalog/application/services/digital-file.service';
import { IdentityModule } from '../identity/identity.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhookIngestionService } from '../payments/application/services/webhook-ingestion.service';
import { WebhookProcessingService } from '../payments/application/services/webhook-processing.service';
import { DeliveryModule } from '../delivery/delivery.module';
import { DeliveryService } from '../delivery/application/services/delivery.service';
import { OrderingModule } from './ordering.module';
import { CheckoutService } from './application/services/checkout.service';
import { ExpireOrderService } from './application/services/expire-order.service';
import { ReleaseOrderService } from './application/services/release-order.service';
import { ORDER_REPOSITORY, OrderRepository } from './domain/repositories/order.repository';
import { StatusChangeActor } from './domain/value-objects/status-change-actor.vo';

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

describe('Ordering (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let config: AppConfigService;
  let storeService: StoreService;
  let productService: ProductService;
  let digitalFileService: DigitalFileService;
  let checkoutService: CheckoutService;
  let expireOrderService: ExpireOrderService;
  let releaseOrderService: ReleaseOrderService;
  let webhookIngestion: WebhookIngestionService;
  let webhookProcessing: WebhookProcessingService;
  let deliveryService: DeliveryService;
  let outboxRepository: OutboxRepository;
  let idempotencyService: IdempotencyService;
  let orders: OrderRepository;

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
      // Swaps the real Supabase adapter for an in-memory fake so this suite
      // never depends on external storage credentials/buckets being
      // provisioned — matches the existing filesystem/null adapter precedent
      // (StorageModule already treats STORAGE_UPLOADER as swappable by design).
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    config = moduleRef.get(AppConfigService);
    storeService = moduleRef.get(StoreService);
    productService = moduleRef.get(ProductService);
    digitalFileService = moduleRef.get(DigitalFileService);
    checkoutService = moduleRef.get(CheckoutService);
    expireOrderService = moduleRef.get(ExpireOrderService);
    releaseOrderService = moduleRef.get(ReleaseOrderService);
    webhookIngestion = moduleRef.get(WebhookIngestionService);
    webhookProcessing = moduleRef.get(WebhookProcessingService);
    deliveryService = moduleRef.get(DeliveryService);
    outboxRepository = moduleRef.get(OutboxRepository);
    idempotencyService = moduleRef.get(IdempotencyService);
    orders = moduleRef.get(ORDER_REPOSITORY);
  });

  beforeEach(async () => {
    await prisma.notificationDelivery.deleteMany();
    await prisma.balanceTransaction.deleteMany();
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

  const setUpDigitalProduct = async (params: { sellerEmail: string; username: string; price: string }) => {
    const seller = await createUser(prisma, params.sellerEmail, 'seller');
    const store = (await storeService.createStore({ ownerId: seller.id, username: params.username })).unwrap();
    const product = (
      await productService.create(store.id, { name: 'Ebook Belajar Prisma', price: params.price, productType: 'digital' })
    ).unwrap();
    await digitalFileService.upload(store.id, product.id, {
      buffer: Buffer.from('fake ebook content'),
      mimetype: 'application/pdf',
      originalname: 'ebook.pdf',
    });
    await productService.publish(store.id, product.id);
    return { store, product };
  };

  const buildSettledWebhookPayload = (orderNumber: string, grossAmount: string) => {
    const statusCode = '200';
    const serverKey = config.midtransServerKey;
    const signatureKey = createHash('sha512')
      .update(`${orderNumber}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');
    return {
      order_id: orderNumber,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: 'settlement',
      transaction_id: generateId(),
      payment_type: 'qris',
    };
  };

  it('creates a pending_payment order with the correct totals and a snapshotted fee rate', async () => {
    const { product } = await setUpDigitalProduct({
      sellerEmail: 'seller1@example.com',
      username: 'tokoorder1',
      price: '100000',
    });
    const buyer = await createUser(prisma, 'buyer1@example.com', 'buyer');

    const result = await checkoutService.create(buyer.id, {
      items: [{ productId: product.id, qty: 1 }],
      buyerName: 'Test Buyer',
      buyerEmail: 'buyer1@example.com',
      buyerPhone: null,
    });

    expect(result.isOk()).toBe(true);
    const { order, snapToken } = result.unwrap();
    expect(order.status.value).toBe('pending_payment');
    expect(order.total.toString()).toBe('100000');
    expect(order.fee.amount.toString()).toBe('5000');
    expect(snapToken).toBeTruthy();

    const row = await prisma.order.findUnique({ where: { id: order.id } });
    expect(row?.platformFeeRate.toString()).toBe('0.05');
  });

  describe('the full purchase lifecycle', () => {
    it('takes a digital order from checkout through a settled webhook to a downloadable file', async () => {
      const { product } = await setUpDigitalProduct({
        sellerEmail: 'seller2@example.com',
        username: 'tokoorder2',
        price: '50000',
      });
      const buyer = await createUser(prisma, 'buyer2@example.com', 'buyer');

      const checkoutResult = await checkoutService.create(buyer.id, {
        items: [{ productId: product.id, qty: 1 }],
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer2@example.com',
        buyerPhone: null,
      });
      const order = checkoutResult.unwrap().order;

      // Webhook: ingest (signature verify + persist) then process (dedup + transition).
      const payload = buildSettledWebhookPayload(order.orderNumber.value, order.total.toString());
      const ingestResult = await webhookIngestion.ingest(payload);
      expect(ingestResult.isOk()).toBe(true);
      await webhookProcessing.process(ingestResult.unwrap().webhookEventId);

      const paidOrder = await orders.findById(order.id);
      expect(paidOrder?.status.value).toBe('holding');
      expect(paidOrder?.holdingUntil).not.toBeNull();

      // Every transition writes exactly one history row: created(1) + paid(1) + holding(1).
      const historyRows = await prisma.orderStatusHistory.count({ where: { orderId: order.id } });
      expect(historyRows).toBe(3);

      // OrderPaid landed in the outbox and is claimable by the relay.
      const claimed = await outboxRepository.claimPending(50);
      const orderPaidRow = claimed.find((event) => event.eventType === 'ordering.order_paid');
      expect(orderPaidRow).toBeDefined();
      await outboxRepository.markPublished(orderPaidRow!.id);

      // A duplicate delivery of the same webhook is ignored, not reprocessed.
      const duplicateIngest = await webhookIngestion.ingest(payload);
      await webhookProcessing.process(duplicateIngest.unwrap().webhookEventId);
      const historyRowsAfterDuplicate = await prisma.orderStatusHistory.count({ where: { orderId: order.id } });
      expect(historyRowsAfterDuplicate).toBe(3);
      const duplicateEvent = await prisma.webhookEvent.findUnique({
        where: { id: duplicateIngest.unwrap().webhookEventId },
      });
      expect(duplicateEvent?.status).toBe('ignored');

      // Digital delivery provisioning is idempotent and the file is downloadable.
      await deliveryService.provisionForOrder(order.id);
      await deliveryService.provisionForOrder(order.id);
      const deliveries = await deliveryService.listForBuyer(buyer.id);
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0]?.downloadCount).toBe(0);
      expect(deliveries[0]?.maxDownloads).toBe(3);

      const download = await deliveryService.issueDownloadUrl(deliveries[0]!.id, buyer.id);
      expect(download.isOk()).toBe(true);
      expect(download.unwrap().url.length).toBeGreaterThan(0);

      const afterDownload = await deliveryService.listForBuyer(buyer.id);
      expect(afterDownload[0]?.downloadCount).toBe(1);
    });

    it('rejects a late webhook for an order that has already expired', async () => {
      const { product } = await setUpDigitalProduct({
        sellerEmail: 'seller3@example.com',
        username: 'tokoorder3',
        price: '20000',
      });
      const buyer = await createUser(prisma, 'buyer3@example.com', 'buyer');

      const checkoutResult = await checkoutService.create(buyer.id, {
        items: [{ productId: product.id, qty: 1 }],
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer3@example.com',
        buyerPhone: null,
      });
      const order = checkoutResult.unwrap().order;

      // Force the order into the expirable window and run the batch job.
      await prisma.order.update({
        where: { id: order.id },
        data: { createdAt: new Date(Date.now() - (config.orderExpiryHours + 1) * 60 * 60 * 1000) },
      });
      const batchResult = await expireOrderService.expireBatch(500);
      expect(batchResult.expired).toBe(1);

      const payload = buildSettledWebhookPayload(order.orderNumber.value, order.total.toString());
      const ingestResult = await webhookIngestion.ingest(payload);
      await webhookProcessing.process(ingestResult.unwrap().webhookEventId);

      const untouched = await orders.findById(order.id);
      expect(untouched?.status.value).toBe('expired');
      const event = await prisma.webhookEvent.findUnique({ where: { id: ingestResult.unwrap().webhookEventId } });
      expect(event?.status).toBe('ignored');
    });
  });

  describe('idempotency (POST /checkout)', () => {
    it('replays the stored response for the same key and body', async () => {
      const key = 'idem-key-1';
      const userId = generateId();
      const hash = IdempotencyService.hashBody({ items: [{ productId: 'p1', qty: 1 }] });

      const first = await idempotencyService.begin(key, userId, 'POST /checkout', hash);
      expect(first.kind).toBe('proceed');
      if (first.kind === 'proceed') {
        await idempotencyService.complete(first.recordId, 201, { orderId: 'order-1' });
      }

      const replay = await idempotencyService.begin(key, userId, 'POST /checkout', hash);
      expect(replay.kind).toBe('replay');
      if (replay.kind === 'replay') {
        expect(replay.status).toBe(201);
        expect(replay.body).toEqual({ orderId: 'order-1' });
      }
    });

    it('rejects the same key with a different body as a conflict', async () => {
      const key = 'idem-key-2';
      const userId = generateId();
      const hashA = IdempotencyService.hashBody({ items: [{ productId: 'p1', qty: 1 }] });
      const hashB = IdempotencyService.hashBody({ items: [{ productId: 'p2', qty: 1 }] });

      const first = await idempotencyService.begin(key, userId, 'POST /checkout', hashA);
      if (first.kind === 'proceed') {
        await idempotencyService.complete(first.recordId, 201, { orderId: 'order-1' });
      }

      await expect(idempotencyService.begin(key, userId, 'POST /checkout', hashB)).rejects.toThrow();
    });
  });

  describe('cross-tenant isolation', () => {
    it('a buyer cannot read another buyer order via the buyer-scoped domain check', async () => {
      const { product } = await setUpDigitalProduct({
        sellerEmail: 'seller4@example.com',
        username: 'tokoorder4',
        price: '15000',
      });
      const buyerA = await createUser(prisma, 'buyera@example.com', 'buyer');
      const buyerB = await createUser(prisma, 'buyerb@example.com', 'buyer');

      const checkoutResult = await checkoutService.create(buyerA.id, {
        items: [{ productId: product.id, qty: 1 }],
        buyerName: 'Buyer A',
        buyerEmail: 'buyera@example.com',
        buyerPhone: null,
      });
      const order = checkoutResult.unwrap().order;

      const loaded = await orders.findById(order.id);
      expect(loaded?.belongsToBuyer(buyerA.id)).toBe(true);
      expect(loaded?.belongsToBuyer(buyerB.id)).toBe(false);
    });
  });

  describe('release-holding-balance (Sprint 6)', () => {
    it('releases a due holding order and skips a disputed one', async () => {
      const { product } = await setUpDigitalProduct({
        sellerEmail: 'seller5@example.com',
        username: 'tokoorder5',
        price: '30000',
      });
      const buyer = await createUser(prisma, 'buyer5@example.com', 'buyer');

      // Order A: paid, then forced past its holding floor — releasable.
      const checkoutA = await checkoutService.create(buyer.id, {
        items: [{ productId: product.id, qty: 1 }],
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer5@example.com',
        buyerPhone: null,
      });
      const orderA = checkoutA.unwrap().order;
      const payloadA = buildSettledWebhookPayload(orderA.orderNumber.value, orderA.total.toString());
      const ingestA = await webhookIngestion.ingest(payloadA);
      await webhookProcessing.process(ingestA.unwrap().webhookEventId);
      await prisma.order.update({ where: { id: orderA.id }, data: { holdingUntil: new Date(Date.now() - 1000) } });

      // Order B: paid then manually forced into 'disputed' — must never be released.
      const checkoutB = await checkoutService.create(buyer.id, {
        items: [{ productId: product.id, qty: 1 }],
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer5@example.com',
        buyerPhone: null,
      });
      const orderB = checkoutB.unwrap().order;
      const payloadB = buildSettledWebhookPayload(orderB.orderNumber.value, orderB.total.toString());
      const ingestB = await webhookIngestion.ingest(payloadB);
      await webhookProcessing.process(ingestB.unwrap().webhookEventId);
      await prisma.order.update({
        where: { id: orderB.id },
        data: { status: 'disputed', holdingUntil: new Date(Date.now() - 1000) },
      });

      const result = await releaseOrderService.releaseBatch(500);
      expect(result.released).toBe(1);

      const releasedA = await orders.findById(orderA.id);
      expect(releasedA?.status.value).toBe('released');
      const untouchedB = await orders.findById(orderB.id);
      expect(untouchedB?.status.value).toBe('disputed');

      // OrderReleased landed in and is claimable from the outbox.
      const claimed = await outboxRepository.claimPending(50);
      const releasedEvent = claimed.find(
        (event) => event.eventType === 'ordering.order_released' && event.aggregateId === orderA.id,
      );
      expect(releasedEvent).toBeDefined();

      // Idempotent: a second run finds nothing left to release.
      const secondRun = await releaseOrderService.releaseBatch(500);
      expect(secondRun.released).toBe(0);
    });

    it('a manual release is rejected before the holding floor via the direct execute() path', async () => {
      const { product } = await setUpDigitalProduct({
        sellerEmail: 'seller6@example.com',
        username: 'tokoorder6',
        price: '40000',
      });
      const buyer = await createUser(prisma, 'buyer6@example.com', 'buyer');

      const checkoutResult = await checkoutService.create(buyer.id, {
        items: [{ productId: product.id, qty: 1 }],
        buyerName: 'Test Buyer',
        buyerEmail: 'buyer6@example.com',
        buyerPhone: null,
      });
      const order = checkoutResult.unwrap().order;
      const payload = buildSettledWebhookPayload(order.orderNumber.value, order.total.toString());
      const ingestResult = await webhookIngestion.ingest(payload);
      await webhookProcessing.process(ingestResult.unwrap().webhookEventId);
      // holding_until stays in the future — not yet releasable.

      const result = await releaseOrderService.execute(order.id, StatusChangeActor.system());
      expect(result.isErr()).toBe(true);

      const untouched = await orders.findById(order.id);
      expect(untouched?.status.value).toBe('holding');
    });
  });
});
