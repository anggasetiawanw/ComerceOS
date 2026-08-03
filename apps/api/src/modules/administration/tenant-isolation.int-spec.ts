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
import { OrderingModule } from '../ordering/ordering.module';
import { ReleaseOrderService } from '../ordering/application/services/release-order.service';
import { StatusChangeActor } from '../ordering/domain/value-objects/status-change-actor.vo';
import { OrderNumber } from '../ordering/domain/value-objects/order-number.vo';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LedgerModule } from '../ledger/ledger.module';
import { BankAccountService } from '../ledger/application/services/bank-account.service';
import { WithdrawalService } from '../ledger/application/services/withdrawal.service';
import { WithdrawalReadService } from '../ledger/application/services/withdrawal-read.service';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { InvoiceService } from '../invoicing/application/services/invoice.service';
import { InvoiceReadService } from '../invoicing/application/services/invoice-read.service';

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
      status: 'holding',
      subtotal: params.total,
      discountAmount: 0n,
      total: params.total,
      platformFeeRate: '0.05',
      platformFeeAmount: params.total / 20n,
      paidAt: new Date(),
      holdingUntil: new Date('2020-01-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
  });
  return id;
};

// The cross-tenant isolation suite Sprint 5/6 both left explicitly
// incomplete ("not yet every seller endpoint"). Every check here asserts
// 404, never 403 — the information-hiding precedent ReleaseOrderService,
// InvoiceReadService.getForStore, and this sprint's WithdrawalReadService/
// BankAccountService all share: a store-id mismatch must be indistinguishable
// from "doesn't exist" to a seller probing ids.
describe('Cross-tenant isolation (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let productService: ProductService;
  let releaseOrder: ReleaseOrderService;
  let bankAccounts: BankAccountService;
  let withdrawals: WithdrawalService;
  let withdrawalReads: WithdrawalReadService;
  let invoiceService: InvoiceService;
  let invoiceReads: InvoiceReadService;

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
        LedgerModule,
        InvoicingModule,
      ],
    })
      .overrideProvider(STORAGE_UPLOADER)
      .useValue(fakeStorageUploader)
      .compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    productService = moduleRef.get(ProductService);
    releaseOrder = moduleRef.get(ReleaseOrderService);
    bankAccounts = moduleRef.get(BankAccountService);
    withdrawals = moduleRef.get(WithdrawalService);
    withdrawalReads = moduleRef.get(WithdrawalReadService);
    invoiceService = moduleRef.get(InvoiceService);
    invoiceReads = moduleRef.get(InvoiceReadService);
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

  const setUpTwoStores = async (suffix: string) => {
    const sellerA = await createUser(prisma, `tenant-seller-a-${suffix}@example.com`, 'seller');
    const storeA = (await storeService.createStore({ ownerId: sellerA.id, username: `tenanta${suffix}` })).unwrap();
    const sellerB = await createUser(prisma, `tenant-seller-b-${suffix}@example.com`, 'seller');
    const storeB = (await storeService.createStore({ ownerId: sellerB.id, username: `tenantb${suffix}` })).unwrap();
    return { sellerA, storeA, sellerB, storeB };
  };

  it('products: store B cannot read store A\'s product', async () => {
    const { sellerA, storeA, storeB } = await setUpTwoStores('prod');
    const product = (
      await productService.create(storeA.id, sellerA.id, { name: 'Punya A', price: '10000', productType: 'physical' })
    ).unwrap();

    const result = await productService.getById(storeB.id, product.id);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().status).toBe(404);
  });

  it('orders: store B cannot release store A\'s order', async () => {
    const { storeA, sellerB, storeB } = await setUpTwoStores('order');
    const buyer = await createUser(prisma, 'tenant-buyer-order@example.com', 'buyer');
    const orderId = await createPaidOrderRow(prisma, { storeId: storeA.id, buyerId: buyer.id, total: 100_000n });

    const result = await releaseOrder.execute(orderId, StatusChangeActor.seller(sellerB.id), {
      expectedStoreId: storeB.id,
    });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().status).toBe(404);
  });

  it('invoices: store B cannot read store A\'s invoice', async () => {
    const { storeA, storeB } = await setUpTwoStores('invoice');
    const buyer = await createUser(prisma, 'tenant-buyer-invoice@example.com', 'buyer');
    const orderId = await createPaidOrderRow(prisma, { storeId: storeA.id, buyerId: buyer.id, total: 100_000n });
    const invoice = (await invoiceService.generateForOrder(orderId)).unwrap();

    const result = await invoiceReads.getForStore(invoice.id, storeB.id);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().status).toBe(404);
  });

  it('bank accounts: store B cannot set-default or remove store A\'s bank account', async () => {
    const { sellerA, storeA, sellerB, storeB } = await setUpTwoStores('bank');
    const account = (
      await bankAccounts.add(storeA.id, sellerA.id, {
        bankCode: 'bca',
        accountNumber: '1234567890',
        accountHolderName: 'Seller A',
      })
    ).unwrap();

    const setDefaultResult = await bankAccounts.setDefault(storeB.id, sellerB.id, account.id);
    const removeResult = await bankAccounts.remove(storeB.id, sellerB.id, account.id);

    expect(setDefaultResult.isErr()).toBe(true);
    expect(setDefaultResult.unwrapErr().status).toBe(404);
    expect(removeResult.isErr()).toBe(true);
    expect(removeResult.unwrapErr().status).toBe(404);

    const stillExists = await prisma.bankAccount.findUnique({ where: { id: account.id } });
    expect(stillExists).not.toBeNull();
  });

  it('withdrawals: store B cannot read store A\'s withdrawal', async () => {
    const { sellerA, storeA, storeB } = await setUpTwoStores('withdrawal');
    await prisma.store.update({ where: { id: storeA.id }, data: { availableBalance: 100_000n } });
    await bankAccounts.add(storeA.id, sellerA.id, {
      bankCode: 'bca',
      accountNumber: '1234567890',
      accountHolderName: 'Seller A',
    });
    const requested = (await withdrawals.request(storeA.id, sellerA.id, 100_000n)).unwrap();

    const result = await withdrawalReads.getForStore(storeB.id, requested.id);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().status).toBe(404);
  });
});
