import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { CacheModule } from '../../shared/infrastructure/cache/cache.module';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/application/services/store.service';
import { SocialLinkService } from '../store/application/services/social-link.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ProductService } from '../catalog/application/services/product.service';
import { StorefrontModule } from './storefront.module';
import { StorefrontService, storefrontCacheKey } from './application/services/storefront.service';
import { StorefrontCacheInvalidator } from './application/services/storefront-cache.invalidator';
import { STOREFRONT_READ_REPOSITORY, StorefrontReadRepository } from './application/ports/storefront-read.repository';

const createUser = async (prisma: PrismaService, email: string) =>
  prisma.user.create({
    data: {
      id: generateId(),
      email,
      name: 'Test Seller',
      role: 'seller',
      emailVerifiedAt: new Date(),
      passwordHash: 'irrelevant-for-this-test',
    },
  });

describe('Storefront (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let socialLinkService: SocialLinkService;
  let productService: ProductService;
  let storefrontService: StorefrontService;
  let readRepository: StorefrontReadRepository;

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
        CatalogModule,
        StorefrontModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    socialLinkService = moduleRef.get(SocialLinkService);
    productService = moduleRef.get(ProductService);
    storefrontService = moduleRef.get(StorefrontService);
    readRepository = moduleRef.get(STOREFRONT_READ_REPOSITORY);

    moduleRef.get(StorefrontCacheInvalidator).onModuleInit();
  });

  beforeEach(async () => {
    await prisma.notificationDelivery.deleteMany();
    await prisma.balanceTransaction.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.bankAccount.deleteMany();
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

  it('returns not-found for an unknown username', async () => {
    const result = await storefrontService.getByUsername('nobodyhere');
    expect(result).toBeNull();
  });

  it('returns only the public field set for a known username', async () => {
    const user = await createUser(prisma, 'seller1@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokopublik', displayName: 'Toko Publik' });

    const result = await storefrontService.getByUsername('tokopublik');

    expect(result).not.toBeNull();
    expect(Object.keys(result ?? {}).sort()).toEqual(
      [
        'avatarUrl',
        'bannerUrl',
        'bio',
        'displayName',
        'hasWhatsapp',
        'id',
        'plan',
        'products',
        'socialLinks',
        'theme',
        'username',
      ].sort(),
    );
  });

  it('returns social links ordered by position', async () => {
    const user = await createUser(prisma, 'seller2@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokolinkpublik' });
    const a = (
      await socialLinkService.add(user.id, { platform: 'instagram', url: 'https://instagram.com/a' })
    ).unwrap();
    const b = (
      await socialLinkService.add(user.id, { platform: 'tiktok', url: 'https://tiktok.com/@b' })
    ).unwrap();
    await socialLinkService.reorder(user.id, [b.id, a.id]);

    const result = await storefrontService.getByUsername('tokolinkpublik');

    expect(result?.socialLinks.map((link) => link.id)).toEqual([b.id, a.id]);
  });

  it('serves the second call from Redis without hitting the read repository again', async () => {
    const user = await createUser(prisma, 'seller3@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokocache' });

    const spy = jest.spyOn(readRepository, 'findByUsername');

    await storefrontService.getByUsername('tokocache');
    await storefrontService.getByUsername('tokocache');

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('invalidates the cache after a profile update, serving fresh data next read', async () => {
    const user = await createUser(prisma, 'seller4@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokobio', displayName: 'Sebelum' });
    await storefrontService.getByUsername('tokobio');

    await storeService.updateProfile(user.id, { displayName: 'Sesudah' });

    const result = await storefrontService.getByUsername('tokobio');
    expect(result?.displayName).toBe('Sesudah');
  });

  it('deletes the old key and resolves the new handle after a username change', async () => {
    const user = await createUser(prisma, 'seller5@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokolama2' });
    await storefrontService.getByUsername('tokolama2');

    await storeService.changeUsername(user.id, 'tokobaru2');

    const oldResult = await storefrontService.getByUsername('tokolama2');
    const newResult = await storefrontService.getByUsername('tokobaru2');
    expect(oldResult).toBeNull();
    expect(newResult).not.toBeNull();
  });

  it('resolves case-insensitively', async () => {
    const user = await createUser(prisma, 'seller6@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokosaya3' });

    const result = await storefrontService.getByUsername('TokoSaya3');

    expect(result?.username).toBe('tokosaya3');
  });

  it('treats a corrupt cache entry as a miss rather than crashing', async () => {
    const user = await createUser(prisma, 'seller7@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokocorrupt' });

    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.set(storefrontCacheKey('tokocorrupt'), JSON.stringify({ garbage: true }), 'EX', 60);

    const result = await storefrontService.getByUsername('tokocorrupt');

    expect(result?.username).toBe('tokocorrupt');
  });

  describe('catalog integration', () => {
    it('embeds only active products, never draft ones', async () => {
      const user = await createUser(prisma, 'seller8@example.com');
      const store = (
        await storeService.createStore({ ownerId: user.id, username: 'tokoproduk' })
      ).unwrap();

      const draft = (
        await productService.create(store.id, store.ownerId, { name: 'Draft', price: '10000', productType: 'physical' })
      ).unwrap();
      const active = (
        await productService.create(store.id, store.ownerId, { name: 'Aktif', price: '20000', productType: 'physical' })
      ).unwrap();
      await productService.publish(store.id, store.ownerId, active.id);

      const result = await storefrontService.getByUsername('tokoproduk');

      expect(result?.products.map((product) => product.id)).toEqual([active.id]);
      expect(result?.products.map((product) => product.id)).not.toContain(draft.id);
    });

    it('serves product detail by slug for an active product', async () => {
      const user = await createUser(prisma, 'seller9@example.com');
      const store = (
        await storeService.createStore({ ownerId: user.id, username: 'tokoslugpublik' })
      ).unwrap();
      const product = (
        await productService.create(store.id, store.ownerId, {
          name: 'Kaos Polos',
          price: '75000',
          productType: 'physical',
        })
      ).unwrap();
      await productService.publish(store.id, store.ownerId, product.id);

      const result = await storefrontService.getProduct('tokoslugpublik', 'kaos-polos');

      expect(result).not.toBeNull();
      expect(result?.price).toBe('75000');
    });

    it('returns null for a draft product slug (not yet public)', async () => {
      const user = await createUser(prisma, 'seller10@example.com');
      const store = (
        await storeService.createStore({ ownerId: user.id, username: 'tokodraftslug' })
      ).unwrap();
      await productService.create(store.id, store.ownerId, { name: 'Belum Terbit', price: '10000', productType: 'physical' });

      const result = await storefrontService.getProduct('tokodraftslug', 'belum-terbit');

      expect(result).toBeNull();
    });

    it('busts the storefront cache when a product is published', async () => {
      const user = await createUser(prisma, 'seller11@example.com');
      const store = (
        await storeService.createStore({ ownerId: user.id, username: 'tokopublish' })
      ).unwrap();
      const product = (
        await productService.create(store.id, store.ownerId, { name: 'Produk A', price: '10000', productType: 'physical' })
      ).unwrap();

      const before = await storefrontService.getByUsername('tokopublish');
      expect(before?.products).toHaveLength(0);

      await productService.publish(store.id, store.ownerId, product.id);

      const after = await storefrontService.getByUsername('tokopublish');
      expect(after?.products).toHaveLength(1);
    });

    it('busts the storefront cache when a product is archived', async () => {
      const user = await createUser(prisma, 'seller12@example.com');
      const store = (
        await storeService.createStore({ ownerId: user.id, username: 'tokoarchive' })
      ).unwrap();
      const product = (
        await productService.create(store.id, store.ownerId, { name: 'Produk B', price: '10000', productType: 'physical' })
      ).unwrap();
      await productService.publish(store.id, store.ownerId, product.id);

      await storefrontService.getByUsername('tokoarchive');
      await productService.archive(store.id, store.ownerId, product.id);

      const after = await storefrontService.getByUsername('tokoarchive');
      expect(after?.products).toHaveLength(0);
    });
  });
});
