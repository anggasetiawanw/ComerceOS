import { DigitalFileValidator } from './digital-file.validator';

const asFile = (buffer: Buffer, mimetype = 'application/pdf'): Express.Multer.File =>
  ({ buffer, mimetype }) as unknown as Express.Multer.File;

describe('DigitalFileValidator', () => {
  const validator = new DigitalFileValidator();

  it('accepts a non-empty buffer with an allowed content type', () => {
    const buffer = Buffer.from('%PDF-1.4 fake pdf content', 'ascii');
    expect(validator.isValid(asFile(buffer, 'application/pdf'))).toBe(true);
  });

  it('accepts a zip file', () => {
    const buffer = Buffer.from('PK fake zip content', 'ascii');
    expect(validator.isValid(asFile(buffer, 'application/zip'))).toBe(true);
  });

  it('rejects an empty buffer', () => {
    expect(validator.isValid(asFile(Buffer.alloc(0)))).toBe(false);
  });

  it('rejects text/html', () => {
    const buffer = Buffer.from('<html></html>', 'ascii');
    expect(validator.isValid(asFile(buffer, 'text/html'))).toBe(false);
  });

  it('rejects image/svg+xml', () => {
    const buffer = Buffer.from('<svg></svg>', 'ascii');
    expect(validator.isValid(asFile(buffer, 'image/svg+xml'))).toBe(false);
  });

  it('rejects application/xhtml+xml', () => {
    const buffer = Buffer.from('<html></html>', 'ascii');
    expect(validator.isValid(asFile(buffer, 'application/xhtml+xml'))).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(validator.isValid(undefined)).toBe(false);
  });
});
