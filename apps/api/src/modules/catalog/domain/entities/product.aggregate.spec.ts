import { Slug } from '../../../../shared/kernel/value-objects/slug.vo';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { ProductType } from '../value-objects/product-type.vo';
import { StockLevel } from '../value-objects/stock-level.vo';
import { DigitalFile } from './digital-file.entity';
import { MAX_DIGITAL_FILES, MAX_PRODUCT_IMAGES, Product } from './product.aggregate';

const slug = (value = 'kaos-polos') => Slug.create(value).unwrap();
const money = (amount: string) => Money.fromString(amount).unwrap();

const createProduct = (params: { productType?: 'digital' | 'physical' | 'service' } = {}) =>
  Product.create('store-1', {
    name: 'Kaos Polos',
    slug: slug(),
    price: money('50000'),
    productType: ProductType.create(params.productType ?? 'physical').unwrap(),
    stock: StockLevel.unlimited(),
  }).unwrap();

const digitalFile = (fileName = 'ebook.pdf') =>
  DigitalFile.create({
    productId: 'product-1',
    filePath: `stores/1/products/1/files/${fileName}`,
    fileName,
    sizeBytes: 1024,
    contentType: 'application/pdf',
    maxDownloads: 3,
  }).unwrap();

describe('Product aggregate', () => {
  describe('create', () => {
    it('seeds status draft, empty images, empty digital files, and emits ProductCreated', () => {
      const product = createProduct();

      expect(product.status.isDraft()).toBe(true);
      expect(product.images.count).toBe(0);
      expect(product.digitalFiles).toHaveLength(0);

      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventName).toBe('catalog.product_created');
    });

    it('rejects an empty name', () => {
      const result = Product.create('store-1', {
        name: '   ',
        slug: slug(),
        price: money('10000'),
        productType: ProductType.digital(),
        stock: StockLevel.unlimited(),
      });
      expect(result.isErr()).toBe(true);
    });

    it('trims the name', () => {
      const result = Product.create('store-1', {
        name: '  Kaos Polos  ',
        slug: slug(),
        price: money('10000'),
        productType: ProductType.digital(),
        stock: StockLevel.unlimited(),
      });
      expect(result.unwrap().name).toBe('Kaos Polos');
    });
  });

  describe('belongsTo', () => {
    it('is true for the owning store and false otherwise', () => {
      const product = createProduct();
      expect(product.belongsTo('store-1')).toBe(true);
      expect(product.belongsTo('store-2')).toBe(false);
    });
  });

  describe('updateDetails', () => {
    it('updates fields and emits ProductUpdated', () => {
      const product = createProduct();
      product.pullDomainEvents();

      product.updateDetails({ name: 'Kaos Polos Premium', price: money('75000') });

      expect(product.name).toBe('Kaos Polos Premium');
      expect(product.price.amount).toBe(75000n);
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventName).toBe('catalog.product_updated');
    });

    it('rejects clearing the name to empty', () => {
      const product = createProduct();
      const result = product.updateDetails({ name: '   ' });
      expect(result.isErr()).toBe(true);
    });

    it('setting hpp to null explicitly clears it', () => {
      const product = createProduct();
      product.updateDetails({ hpp: money('20000') });
      product.updateDetails({ hpp: null });
      expect(product.hpp).toBeNull();
    });
  });

  describe('changeSlug', () => {
    it('is a no-op when unchanged', () => {
      const product = createProduct();
      product.pullDomainEvents();

      product.changeSlug(slug('kaos-polos'));

      expect(product.pullDomainEvents()).toHaveLength(0);
    });

    it('carries the previous slug when changed', () => {
      const product = createProduct();
      product.pullDomainEvents();

      product.changeSlug(slug('kaos-polos-baru'));

      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as unknown as { slug: string; previousSlug: string | null };
      expect(event.slug).toBe('kaos-polos-baru');
      expect(event.previousSlug).toBe('kaos-polos');
    });
  });

  describe('changeStock', () => {
    it('emits ProductUpdated on a normal change', () => {
      const product = createProduct();
      product.pullDomainEvents();

      product.changeStock(StockLevel.of(5).unwrap());

      const events = product.pullDomainEvents();
      expect(events.map((event) => event.eventName)).toEqual(['catalog.product_updated']);
    });

    it('also emits ProductStockDepleted when the level reaches zero', () => {
      const product = createProduct();
      product.pullDomainEvents();

      product.changeStock(StockLevel.of(0).unwrap());

      const events = product.pullDomainEvents();
      expect(events.map((event) => event.eventName)).toEqual([
        'catalog.product_updated',
        'catalog.product_stock_depleted',
      ]);
    });
  });

  describe('publish', () => {
    it('rejects publishing a digital product with no files', () => {
      const product = createProduct({ productType: 'digital' });
      const result = product.publish();
      expect(result.isErr()).toBe(true);
      expect(product.status.isDraft()).toBe(true);
    });

    it('publishes a digital product once a file is attached', () => {
      const product = createProduct({ productType: 'digital' });
      product.attachDigitalFile(digitalFile());

      const result = product.publish();

      expect(result.isOk()).toBe(true);
      expect(product.status.isActive()).toBe(true);
    });

    it('publishes a physical product with no files', () => {
      const product = createProduct({ productType: 'physical' });
      const result = product.publish();
      expect(result.isOk()).toBe(true);
      expect(product.status.isActive()).toBe(true);
    });

    it('is legal from archived (the only unarchive path)', () => {
      const product = createProduct({ productType: 'physical' });
      product.publish();
      product.archive();

      const result = product.publish();

      expect(result.isOk()).toBe(true);
      expect(product.status.isActive()).toBe(true);
    });

    it('is a no-op when already active', () => {
      const product = createProduct({ productType: 'physical' });
      product.publish();
      product.pullDomainEvents();

      product.publish();

      expect(product.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('archive', () => {
    it('archives and emits ProductArchived', () => {
      const product = createProduct();
      product.pullDomainEvents();

      product.archive();

      expect(product.status.isArchived()).toBe(true);
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventName).toBe('catalog.product_archived');
    });

    it('is a no-op when already archived', () => {
      const product = createProduct();
      product.archive();
      product.pullDomainEvents();

      product.archive();

      expect(product.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('images', () => {
    it('adds an image and emits ProductUpdated', () => {
      const product = createProduct();
      product.pullDomainEvents();

      const result = product.addImage({ id: 'img-1', path: 'p', url: 'https://cdn.test/a.jpg' });

      expect(result.isOk()).toBe(true);
      expect(product.images.count).toBe(1);
      expect(product.pullDomainEvents()).toHaveLength(1);
    });

    it('rejects adding beyond the max image count', () => {
      const product = createProduct();
      for (let i = 0; i < MAX_PRODUCT_IMAGES; i += 1) {
        product.addImage({ id: `img-${i}`, path: 'p', url: `https://cdn.test/${i}.jpg` });
      }

      const result = product.addImage({ id: 'one-too-many', path: 'p', url: 'https://cdn.test/x.jpg' });

      expect(result.isErr()).toBe(true);
    });

    it('removes an image by id', () => {
      const product = createProduct();
      product.addImage({ id: 'img-1', path: 'p', url: 'https://cdn.test/a.jpg' });
      product.pullDomainEvents();

      const result = product.removeImage('img-1');

      expect(result.isOk()).toBe(true);
      expect(product.images.count).toBe(0);
    });

    it('rejects removing an image that does not exist', () => {
      const product = createProduct();
      const result = product.removeImage('missing');
      expect(result.isErr()).toBe(true);
    });
  });

  describe('digital files', () => {
    it('attaches a digital file and emits DigitalFileAttached', () => {
      const product = createProduct({ productType: 'digital' });
      product.pullDomainEvents();

      const result = product.attachDigitalFile(digitalFile());

      expect(result.isOk()).toBe(true);
      expect(product.digitalFiles).toHaveLength(1);
      const events = product.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.eventName).toBe('catalog.digital_file_attached');
    });

    it('rejects attaching beyond the max file count', () => {
      const product = createProduct({ productType: 'digital' });
      for (let i = 0; i < MAX_DIGITAL_FILES; i += 1) {
        product.attachDigitalFile(digitalFile(`file-${i}.pdf`));
      }

      const result = product.attachDigitalFile(digitalFile('one-too-many.pdf'));

      expect(result.isErr()).toBe(true);
    });

    it('removes a digital file from a draft product freely', () => {
      const product = createProduct({ productType: 'digital' });
      const file = digitalFile();
      product.attachDigitalFile(file);

      const result = product.removeDigitalFile(file.id);

      expect(result.isOk()).toBe(true);
      expect(product.digitalFiles).toHaveLength(0);
    });

    it('rejects removing the last file from an active digital product', () => {
      const product = createProduct({ productType: 'digital' });
      const file = digitalFile();
      product.attachDigitalFile(file);
      product.publish();

      const result = product.removeDigitalFile(file.id);

      expect(result.isErr()).toBe(true);
      expect(product.digitalFiles).toHaveLength(1);
    });

    it('allows removing a file from an active digital product when another remains', () => {
      const product = createProduct({ productType: 'digital' });
      const first = digitalFile('a.pdf');
      const second = digitalFile('b.pdf');
      product.attachDigitalFile(first);
      product.attachDigitalFile(second);
      product.publish();

      const result = product.removeDigitalFile(first.id);

      expect(result.isOk()).toBe(true);
      expect(product.digitalFiles).toHaveLength(1);
    });

    it('rejects removing a digital file that does not exist', () => {
      const product = createProduct({ productType: 'digital' });
      const result = product.removeDigitalFile('missing');
      expect(result.isErr()).toBe(true);
    });
  });
});
