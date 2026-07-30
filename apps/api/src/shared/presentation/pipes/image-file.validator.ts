import { FileValidator } from '@nestjs/common';

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

const matchesAt = (buffer: Buffer, bytes: number[], offset: number): boolean =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

const isJpeg = (buffer: Buffer): boolean => matchesAt(buffer, JPEG_MAGIC, 0);
const isPng = (buffer: Buffer): boolean => matchesAt(buffer, PNG_MAGIC, 0);
const isWebp = (buffer: Buffer): boolean => matchesAt(buffer, RIFF_MAGIC, 0) && matchesAt(buffer, WEBP_MAGIC, 8);

export class ImageFileValidator extends FileValidator<Record<string, never>> {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file || !file.buffer || file.buffer.length < 12) return false;
    return isJpeg(file.buffer) || isPng(file.buffer) || isWebp(file.buffer);
  }

  buildErrorMessage(): string {
    return 'File is not a valid JPEG, PNG, or WebP image';
  }
}
