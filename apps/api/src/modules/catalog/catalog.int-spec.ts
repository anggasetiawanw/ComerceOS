import { access } from 'node:fs/promises';
import * as path from 'node:path';
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
import { CatalogModule } from './catalog.module';
import { ProductService } from './application/services/product.service';
import { ProductMediaService } from './application/services/product-media.service';
import { DigitalFileService } from './application/services/digital-file.service';

const UPLOAD_ROOT = path.resolve(process.cwd(), '..', '..', 'web', 'public', 'uploads');

const fileExists = async (relativePath: string): Promise<boolean> => {
  try {
    await access(path.join(UPLOAD_ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
};

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

const jpegBuffer = () => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('Catalog (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let productService: ProductService;
  let productMediaService: ProductMediaService;
  let digitalFileService: DigitalFileService;

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
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    productService = moduleRef.get(ProductService);
    productMediaService = moduleRef.get(ProductMediaService);
    digitalFileService = moduleRef.get(DigitalFileService);
  });

  beforeEach(async () => {
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

  const createStore = async (email: string, username: string) => {
    const user = await createUser(prisma, email);
    return (await storeService.createStore({ ownerId: user.id, username })).unwrap();
  };

  it('round-trips a bigint price through Postgres', async () => {
    const store = await createStore('seller1@example.com', 'tokocatalog1');

    const created = (
      await productService.create(store.id, { name: 'Produk Mahal', price: '999999999', productType: 'physical' })
    ).unwrap();

    const row = await prisma.product.findUnique({ where: { id: created.id } });
    expect(row?.price).toBe(999999999n);
  });

  describe('slugs', () => {
    it('rejects a duplicate explicit slug within the same store', async () => {
      const store = await createStore('seller2@example.com', 'tokocatalog2');
      await productService.create(store.id, { name: 'A', slug: 'produk-a', price: '1000', productType: 'physical' });

      const result = await productService.create(store.id, {
        name: 'B',
        slug: 'produk-a',
        price: '2000',
        productType: 'physical',
      });

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('CATALOG.SLUG_TAKEN');
    });

    it('allows the same slug across two different stores', async () => {
      const storeA = await createStore('seller3@example.com', 'tokocatalog3a');
      const storeB = await createStore('seller4@example.com', 'tokocatalog3b');

      await productService.create(storeA.id, { name: 'A', slug: 'sama', price: '1000', productType: 'physical' });
      const result = await productService.create(storeB.id, {
        name: 'B',
        slug: 'sama',
        price: '1000',
        productType: 'physical',
      });

      expect(result.isOk()).toBe(true);
    });

    it('auto-suffixes a derived slug on collision', async () => {
      const store = await createStore('seller5@example.com', 'tokocatalog5');
      await productService.create(store.id, { name: 'Kaos Polos', price: '1000', productType: 'physical' });

      const second = (
        await productService.create(store.id, { name: 'Kaos Polos', price: '1000', productType: 'physical' })
      ).unwrap();

      expect(second.slug.value).toBe('kaos-polos-2');
    });
  });

  describe('cross-tenant isolation', () => {
    it('returns not-found for a product owned by a different store', async () => {
      const storeA = await createStore('seller6@example.com', 'tokocatalog6a');
      const storeB = await createStore('seller7@example.com', 'tokocatalog6b');
      const product = (
        await productService.create(storeA.id, { name: 'Punya A', price: '1000', productType: 'physical' })
      ).unwrap();

      const result = await productService.getById(storeB.id, product.id);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('CATALOG.PRODUCT_NOT_FOUND');
    });
  });

  describe('publish', () => {
    it('rejects publishing a digital product with no files', async () => {
      const store = await createStore('seller8@example.com', 'tokocatalog8');
      const product = (
        await productService.create(store.id, { name: 'Ebook', price: '10000', productType: 'digital' })
      ).unwrap();

      const result = await productService.publish(store.id, product.id);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('CATALOG.DIGITAL_FILE_REQUIRED');
    });

    it('publishes once a digital file is attached', async () => {
      const store = await createStore('seller9@example.com', 'tokocatalog9');
      const product = (
        await productService.create(store.id, { name: 'Ebook', price: '10000', productType: 'digital' })
      ).unwrap();
      await digitalFileService.upload(store.id, product.id, {
        buffer: Buffer.from('fake ebook'),
        mimetype: 'application/pdf',
        originalname: 'ebook.pdf',
      });

      const result = await productService.publish(store.id, product.id);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().status.isActive()).toBe(true);
    });
  });

  it('archives a product', async () => {
    const store = await createStore('seller10@example.com', 'tokocatalog10');
    const product = (
      await productService.create(store.id, { name: 'Produk', price: '10000', productType: 'physical' })
    ).unwrap();

    const result = await productService.archive(store.id, product.id);

    expect(result.isOk()).toBe(true);
    const row = await prisma.product.findUnique({ where: { id: product.id } });
    expect(row?.status).toBe('archived');
  });

  describe('image upload via the filesystem storage adapter', () => {
    it('writes the file to disk, records it in the images jsonb, and removes it on delete', async () => {
      const store = await createStore('seller11@example.com', 'tokocatalog11');
      const product = (
        await productService.create(store.id, { name: 'Produk Gambar', price: '10000', productType: 'physical' })
      ).unwrap();

      const uploadResult = await productMediaService.uploadImage(store.id, product.id, {
        buffer: jpegBuffer(),
        mimetype: 'image/jpeg',
      });
      expect(uploadResult.isOk()).toBe(true);
      const uploaded = uploadResult.unwrap();
      expect(uploaded.images.count).toBe(1);
      const image = uploaded.images.items[0];
      if (!image) throw new Error('Expected an uploaded image');

      expect(await fileExists(path.join('public', image.path))).toBe(true);

      const row = await prisma.product.findUnique({ where: { id: product.id } });
      const storedImages = row?.images;
      expect(Array.isArray(storedImages)).toBe(true);
      const isIdRecord = (value: unknown): value is { id: string } =>
        typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
      const storedImage = Array.isArray(storedImages) ? storedImages.find(isIdRecord) : undefined;
      expect(storedImage?.id).toBe(image.id);

      const removeResult = await productMediaService.removeImage(store.id, product.id, image.id);
      expect(removeResult.isOk()).toBe(true);
      expect(removeResult.unwrap().images.count).toBe(0);
      expect(await fileExists(path.join('public', image.path))).toBe(false);
    });
  });

  describe('digital files', () => {
    it('stores a private file_path, never a URL, in the database', async () => {
      const store = await createStore('seller12@example.com', 'tokocatalog12');
      const product = (
        await productService.create(store.id, { name: 'Ebook', price: '10000', productType: 'digital' })
      ).unwrap();

      const result = await digitalFileService.upload(store.id, product.id, {
        buffer: Buffer.from('fake ebook content'),
        mimetype: 'application/pdf',
        originalname: 'ebook.pdf',
      });
      expect(result.isOk()).toBe(true);

      const row = await prisma.digitalFile.findUnique({ where: { id: result.unwrap().id } });
      expect(row?.filePath).not.toMatch(/^https?:\/\//);
      expect(await fileExists(path.join('private', row?.filePath ?? ''))).toBe(true);
    });

    it('rejects removing the last file from an active digital product', async () => {
      const store = await createStore('seller13@example.com', 'tokocatalog13');
      const product = (
        await productService.create(store.id, { name: 'Ebook', price: '10000', productType: 'digital' })
      ).unwrap();
      const file = (
        await digitalFileService.upload(store.id, product.id, {
          buffer: Buffer.from('fake ebook'),
          mimetype: 'application/pdf',
          originalname: 'ebook.pdf',
        })
      ).unwrap();
      await productService.publish(store.id, product.id);

      const result = await digitalFileService.remove(store.id, product.id, file.id);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('CATALOG.LAST_DIGITAL_FILE_REQUIRED');
    });
  });

  describe('pagination', () => {
    it('paginates listByStore with an offset window', async () => {
      const store = await createStore('seller14@example.com', 'tokocatalog14');
      for (let i = 0; i < 5; i += 1) {
        await productService.create(store.id, { name: `Produk ${i}`, price: '1000', productType: 'physical' });
      }

      const page1 = await productService.list(store.id, { page: 1, limit: 2 });
      const page2 = await productService.list(store.id, { page: 2, limit: 2 });

      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.items.map((p) => p.id)).not.toEqual(page2.items.map((p) => p.id));
    });
  });

  describe('foreign key behavior', () => {
    it('rejects deleting a store while a product exists (RESTRICT)', async () => {
      const store = await createStore('seller15@example.com', 'tokocatalog15');
      await productService.create(store.id, { name: 'Produk', price: '1000', productType: 'physical' });

      await expect(prisma.store.delete({ where: { id: store.id } })).rejects.toThrow();
    });

    it('cascades digital_files when a product is deleted', async () => {
      const store = await createStore('seller16@example.com', 'tokocatalog16');
      const product = (
        await productService.create(store.id, { name: 'Ebook', price: '1000', productType: 'digital' })
      ).unwrap();
      await digitalFileService.upload(store.id, product.id, {
        buffer: Buffer.from('fake ebook'),
        mimetype: 'application/pdf',
        originalname: 'ebook.pdf',
      });

      await prisma.product.delete({ where: { id: product.id } });

      const remaining = await prisma.digitalFile.findMany({ where: { productId: product.id } });
      expect(remaining).toHaveLength(0);
    });
  });
});
