import { ImageFileValidator } from './image-file.validator';

const asFile = (buffer: Buffer): Express.Multer.File => ({ buffer }) as unknown as Express.Multer.File;

describe('ImageFileValidator', () => {
  const validator = new ImageFileValidator();

  it('accepts a JPEG magic byte sequence', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(validator.isValid(asFile(buffer))).toBe(true);
  });

  it('accepts a PNG magic byte sequence', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(validator.isValid(asFile(buffer))).toBe(true);
  });

  it('accepts a WebP magic byte sequence', () => {
    const buffer = Buffer.from('RIFF....WEBP', 'ascii');
    expect(validator.isValid(asFile(buffer))).toBe(true);
  });

  it('rejects a text buffer even with an image mimetype claim', () => {
    const buffer = Buffer.from('this is definitely not an image file', 'ascii');
    expect(validator.isValid(asFile(buffer))).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });
});
