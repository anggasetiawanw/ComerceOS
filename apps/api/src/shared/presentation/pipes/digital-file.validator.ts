import { FileValidator } from '@nestjs/common';

const DISALLOWED_CONTENT_TYPES = new Set(['text/html', 'image/svg+xml', 'application/xhtml+xml']);

export class DigitalFileValidator extends FileValidator<Record<string, never>> {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file || !file.buffer || file.buffer.length === 0) return false;
    return !DISALLOWED_CONTENT_TYPES.has(file.mimetype);
  }

  buildErrorMessage(): string {
    return 'File is empty or of a disallowed content type';
  }
}
