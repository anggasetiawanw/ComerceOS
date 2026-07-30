import { ProductImages } from './product-images.vo';

const image = (id: string, url = `https://cdn.test/${id}.jpg`) => ({ id, path: `stores/1/products/1/images/${id}.jpg`, url });

describe('ProductImages', () => {
  describe('create', () => {
    it('accepts an empty array', () => {
      const result = ProductImages.create([]);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().count).toBe(0);
    });

    it('accepts a valid array of images', () => {
      const result = ProductImages.create([image('a'), image('b')]);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().count).toBe(2);
    });

    it('accepts an http url (dev filesystem storage adapter)', () => {
      const result = ProductImages.create([image('a', 'http://localhost:3000/uploads/public/a.jpg')]);
      expect(result.isOk()).toBe(true);
    });

    it('rejects non-array input', () => {
      const result = ProductImages.create({ not: 'an array' });
      expect(result.isErr()).toBe(true);
    });

    it('rejects an entry missing a required field', () => {
      const result = ProductImages.create([{ id: 'a', url: 'https://cdn.test/a.jpg' }]);
      expect(result.isErr()).toBe(true);
    });

    it('rejects an entry with an invalid url', () => {
      const result = ProductImages.create([{ id: 'a', path: 'p', url: 'not-a-url' }]);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('empty', () => {
    it('starts with zero images and a null primary url', () => {
      const images = ProductImages.empty();
      expect(images.count).toBe(0);
      expect(images.primaryUrl).toBeNull();
    });
  });

  describe('withAdded / withRemoved', () => {
    it('appends an image immutably', () => {
      const images = ProductImages.empty();
      const next = images.withAdded(image('a'));
      expect(images.count).toBe(0);
      expect(next.count).toBe(1);
    });

    it('removes an image by id immutably', () => {
      const images = ProductImages.create([image('a'), image('b')]).unwrap();
      const next = images.withRemoved('a');
      expect(images.count).toBe(2);
      expect(next.count).toBe(1);
      expect(next.has('a')).toBe(false);
      expect(next.has('b')).toBe(true);
    });

    it('is a no-op when removing an id that does not exist', () => {
      const images = ProductImages.create([image('a')]).unwrap();
      const next = images.withRemoved('missing');
      expect(next.count).toBe(1);
    });
  });

  describe('primaryUrl', () => {
    it('returns the first image url', () => {
      const images = ProductImages.create([image('a'), image('b')]).unwrap();
      expect(images.primaryUrl).toBe('https://cdn.test/a.jpg');
    });
  });

  describe('toJSON', () => {
    it('serializes to a plain array', () => {
      const images = ProductImages.create([image('a')]).unwrap();
      expect(images.toJSON()).toEqual([image('a')]);
    });
  });
});
