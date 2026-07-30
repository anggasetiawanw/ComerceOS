import { DigitalFile } from './digital-file.entity';

const validParams = () => ({
  productId: 'product-1',
  filePath: 'stores/1/products/1/files/abc.zip',
  fileName: 'ebook.zip',
  sizeBytes: 1024,
  contentType: 'application/zip',
  maxDownloads: 3,
});

describe('DigitalFile', () => {
  describe('create', () => {
    it('creates a digital file with valid params', () => {
      const result = DigitalFile.create(validParams());
      expect(result.isOk()).toBe(true);
      const file = result.unwrap();
      expect(file.fileName).toBe('ebook.zip');
      expect(file.sizeBytes).toBe(1024);
      expect(file.maxDownloads).toBe(3);
    });

    it('rejects an empty file path', () => {
      const result = DigitalFile.create({ ...validParams(), filePath: '' });
      expect(result.isErr()).toBe(true);
    });

    it('rejects an empty file name', () => {
      const result = DigitalFile.create({ ...validParams(), fileName: '  ' });
      expect(result.isErr()).toBe(true);
    });

    it('rejects a zero size', () => {
      const result = DigitalFile.create({ ...validParams(), sizeBytes: 0 });
      expect(result.isErr()).toBe(true);
    });

    it('rejects a negative size', () => {
      const result = DigitalFile.create({ ...validParams(), sizeBytes: -10 });
      expect(result.isErr()).toBe(true);
    });

    it('rejects a non-integer size', () => {
      const result = DigitalFile.create({ ...validParams(), sizeBytes: 1.5 });
      expect(result.isErr()).toBe(true);
    });

    it('rejects a zero max downloads', () => {
      const result = DigitalFile.create({ ...validParams(), maxDownloads: 0 });
      expect(result.isErr()).toBe(true);
    });

    it('assigns a generated id', () => {
      const file = DigitalFile.create(validParams()).unwrap();
      expect(file.id).toBeTruthy();
    });
  });

  describe('reconstitute', () => {
    it('preserves the given id and does not validate again', () => {
      const props = { ...validParams(), createdAt: new Date() };
      const file = DigitalFile.reconstitute(props, 'fixed-id');
      expect(file.id).toBe('fixed-id');
      expect(file.filePath).toBe(props.filePath);
    });
  });
});
