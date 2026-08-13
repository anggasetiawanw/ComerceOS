import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './shared/infrastructure/prisma/prisma.service';
import { generateId } from './shared/kernel/uuid';
import { Result } from './shared/kernel/result';
import { PasswordHash } from './modules/identity/domain/value-objects/password-hash.vo';
import { StoreService } from './modules/store/application/services/store.service';
import { SocialLinkService } from './modules/store/application/services/social-link.service';
import { Product } from './modules/catalog/domain/entities/product.aggregate';
import { ProductService } from './modules/catalog/application/services/product.service';
import { DigitalFileService } from './modules/catalog/application/services/digital-file.service';
import { Order } from './modules/ordering/domain/entities/order.aggregate';
import { CheckoutService } from './modules/ordering/application/services/checkout.service';
import { MarkOrderPaidService } from './modules/ordering/application/services/mark-order-paid.service';
import { CancelOrderService } from './modules/ordering/application/services/cancel-order.service';
import { ExpireOrderService } from './modules/ordering/application/services/expire-order.service';
import { ReleaseOrderService } from './modules/ordering/application/services/release-order.service';
import { StatusChangeActor } from './modules/ordering/domain/value-objects/status-change-actor.vo';
import { LedgerService } from './modules/ledger/application/services/ledger.service';
import { BankAccountService } from './modules/ledger/application/services/bank-account.service';
import { WithdrawalService } from './modules/ledger/application/services/withdrawal.service';

const DEV_PASSWORD = 'password123';

const unwrapOrThrow = <T, E extends Error>(result: Result<T, E>, label: string): T => {
  if (result.isErr()) {
    throw new Error(`${label} failed: ${result.unwrapErr().message}`);
  }
  return result.unwrap();
};

type ProductKey = 'digitalA' | 'digitalB' | 'physicalA' | 'physicalB' | 'serviceA' | 'serviceB';

interface ProductSpec {
  key: ProductKey;
  name: string;
  description: string;
  productType: 'digital' | 'physical' | 'service';
  price: string;
  hpp: string;
  stock: number | null;
  hasFile: boolean;
}

const PRODUCT_SPECS: ProductSpec[] = [
  {
    key: 'digitalA',
    name: 'E-book Panduan Jualan Online',
    description: 'Panduan lengkap memulai jualan online untuk pemula, format PDF.',
    productType: 'digital',
    price: '49000',
    hpp: '0',
    stock: null,
    hasFile: true,
  },
  {
    key: 'digitalB',
    name: 'Template Invoice Excel',
    description: 'Template invoice siap pakai untuk usaha kecil, format Excel.',
    productType: 'digital',
    price: '25000',
    hpp: '0',
    stock: null,
    hasFile: true,
  },
  {
    key: 'physicalA',
    name: 'Kaos Polos Premium',
    description: 'Kaos katun combed 30s, tersedia berbagai ukuran.',
    productType: 'physical',
    price: '85000',
    hpp: '45000',
    stock: 50,
    hasFile: false,
  },
  {
    key: 'physicalB',
    name: 'Tumbler Custom Logo',
    description: 'Tumbler stainless 500ml dengan cetak logo custom.',
    productType: 'physical',
    price: '65000',
    hpp: '30000',
    stock: 30,
    hasFile: false,
  },
  {
    key: 'serviceA',
    name: 'Jasa Desain Logo',
    description: 'Desain logo profesional, 3 konsep awal, revisi hingga puas.',
    productType: 'service',
    price: '350000',
    hpp: '50000',
    stock: null,
    hasFile: false,
  },
  {
    key: 'serviceB',
    name: 'Jasa Konsultasi Bisnis (1 jam)',
    description: 'Sesi konsultasi bisnis online selama satu jam.',
    productType: 'service',
    price: '200000',
    hpp: '0',
    stock: null,
    hasFile: false,
  },
];

const wipe = async (prisma: PrismaService): Promise<void> => {
  await prisma.notificationDelivery.deleteMany();
  await prisma.auditLog.deleteMany();
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
};

const main = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const prisma = app.get(PrismaService);

    console.log('Wiping existing dev data...');
    await wipe(prisma);

    console.log('Creating users (seller, buyer, admin)...');
    const passwordHash = unwrapOrThrow(await PasswordHash.fromPlainText(DEV_PASSWORD), 'PasswordHash.fromPlainText');
    const seller = await prisma.user.create({
      data: {
        id: generateId(),
        email: 'seller@tokodemo.test',
        name: 'Toko Demo',
        role: 'seller',
        passwordHash: passwordHash.hash,
        emailVerifiedAt: new Date(),
      },
    });
    const buyer = await prisma.user.create({
      data: {
        id: generateId(),
        email: 'buyer@tokodemo.test',
        name: 'Budi Pembeli',
        role: 'buyer',
        passwordHash: passwordHash.hash,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.user.create({
      data: {
        id: generateId(),
        email: 'admin@tokodemo.test',
        name: 'Admin Nagihin',
        role: 'admin',
        passwordHash: passwordHash.hash,
        emailVerifiedAt: new Date(),
      },
    });

    console.log('Creating store @tokodemo...');
    const storeService = app.get(StoreService);
    const store = unwrapOrThrow(
      await storeService.createStore({ ownerId: seller.id, username: 'tokodemo', displayName: 'Toko Demo' }),
      'createStore',
    );
    unwrapOrThrow(
      await storeService.updateProfile(seller.id, {
        bio: 'Toko contoh untuk pengembangan dan pengujian lokal.',
      }),
      'updateProfile',
    );

    const socialLinks = app.get(SocialLinkService);
    unwrapOrThrow(
      await socialLinks.add(seller.id, { platform: 'instagram', url: 'https://instagram.com/tokodemo' }),
      'add social link (instagram)',
    );
    unwrapOrThrow(
      await socialLinks.add(seller.id, { platform: 'whatsapp', url: 'https://wa.me/6281234567890' }),
      'add social link (whatsapp)',
    );

    console.log('Creating and publishing 6 products...');
    const products = app.get(ProductService);
    const digitalFiles = app.get(DigitalFileService);
    const createdProducts = new Map<ProductKey, Product>();

    for (const spec of PRODUCT_SPECS) {
      const product = unwrapOrThrow(
        await products.create(store.id, seller.id, {
          name: spec.name,
          description: spec.description,
          price: spec.price,
          hpp: spec.hpp,
          productType: spec.productType,
          stock: spec.stock,
        }),
        `create product "${spec.name}"`,
      );

      if (spec.hasFile) {
        unwrapOrThrow(
          await digitalFiles.upload(store.id, product.id, {
            buffer: Buffer.from(`Placeholder file content for ${spec.name}\n`, 'utf-8'),
            mimetype: 'application/pdf',
            originalname: `${product.slug.value}.pdf`,
          }),
          `upload digital file for "${spec.name}"`,
        );
      }

      unwrapOrThrow(await products.publish(store.id, seller.id, product.id), `publish "${spec.name}"`);
      createdProducts.set(spec.key, product);
    }

    const getProduct = (key: ProductKey): Product => {
      const product = createdProducts.get(key);
      if (!product) throw new Error(`Product "${key}" was not created`);
      return product;
    };

    console.log('Creating orders across every reachable status...');
    const checkout = app.get(CheckoutService);
    const markPaid = app.get(MarkOrderPaidService);
    const cancelOrder = app.get(CancelOrderService);
    const expireOrder = app.get(ExpireOrderService);
    const releaseOrder = app.get(ReleaseOrderService);
    const ledger = app.get(LedgerService);

    const createOrder = async (items: { productId: string; qty: number }[]): Promise<Order> =>
      unwrapOrThrow(
        await checkout.create(buyer.id, {
          items,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          buyerPhone: '081234567890',
        }),
        'checkout.create',
      ).order;

    const markAsPaid = async (order: Order): Promise<void> => {
      unwrapOrThrow(
        await markPaid.execute(order.id, { method: 'bank_transfer', transactionId: `dev-${order.id.slice(0, 8)}` }),
        `markPaid(${order.orderNumber.value})`,
      );
    };

    console.log('Creating pending_payment orders...');
    await createOrder([{ productId: getProduct('digitalA').id, qty: 1 }]);
    await createOrder([{ productId: getProduct('physicalA').id, qty: 2 }]);

    console.log('Creating holding orders...');
    for (const items of [
      [{ productId: getProduct('digitalB').id, qty: 1 }],
      [{ productId: getProduct('serviceA').id, qty: 1 }],
      [{ productId: getProduct('physicalB').id, qty: 1 }],
    ]) {
      const order = await createOrder(items);
      await markAsPaid(order);
      unwrapOrThrow(await ledger.creditHoldingForOrder(order.id), 'creditHoldingForOrder');
    }

    console.log('Creating released orders...');
    for (const items of [
      [{ productId: getProduct('digitalA').id, qty: 1 }],
      [{ productId: getProduct('serviceB').id, qty: 1 }],
    ]) {
      const order = await createOrder(items);
      await markAsPaid(order);
      unwrapOrThrow(await ledger.creditHoldingForOrder(order.id), 'creditHoldingForOrder');
      await prisma.order.update({ where: { id: order.id }, data: { holdingUntil: new Date(Date.now() - 60_000) } });
      unwrapOrThrow(await releaseOrder.execute(order.id, StatusChangeActor.system()), 'releaseOrder');
      unwrapOrThrow(await ledger.releaseToAvailableForOrder(order.id), 'releaseToAvailableForOrder');
    }

    console.log('Creating a cancelled order...');
    {
      const order = await createOrder([{ productId: getProduct('physicalA').id, qty: 1 }]);
      unwrapOrThrow(await cancelOrder.execute(order.id, StatusChangeActor.buyer(buyer.id), 'Berubah pikiran'), 'cancelOrder');
    }

    console.log('Creating an expired order...');
    {
      const order = await createOrder([{ productId: getProduct('digitalB').id, qty: 1 }]);
      unwrapOrThrow(await expireOrder.execute(order.id), 'expireOrder');
    }

    console.log('Adding a bank account and one pending withdrawal...');
    const bankAccounts = app.get(BankAccountService);
    unwrapOrThrow(
      await bankAccounts.add(store.id, seller.id, {
        bankCode: 'bca',
        accountNumber: '1234567890',
        accountHolderName: 'Toko Demo',
        makeDefault: true,
      }),
      'bankAccounts.add',
    );

    const withdrawals = app.get(WithdrawalService);
    unwrapOrThrow(await withdrawals.request(store.id, seller.id, 50_000n), 'withdrawals.request');

    console.log('Creating a disputed and a refunded order...');
    {
      const order = await createOrder([{ productId: getProduct('serviceA').id, qty: 1 }]);
      await markAsPaid(order);
      await prisma.order.update({ where: { id: order.id }, data: { status: 'disputed' } });
    }
    {
      const order = await createOrder([{ productId: getProduct('physicalB').id, qty: 1 }]);
      await markAsPaid(order);
      await prisma.order.update({ where: { id: order.id }, data: { status: 'refunded' } });
    }

    console.log('\nSeed complete.\n');
    console.log('  Seller: seller@tokodemo.test / ' + DEV_PASSWORD);
    console.log('  Buyer:  buyer@tokodemo.test / ' + DEV_PASSWORD);
    console.log('  Admin:  admin@tokodemo.test / ' + DEV_PASSWORD);
    console.log('  Store:  @tokodemo\n');
  } finally {
    await app.close();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
