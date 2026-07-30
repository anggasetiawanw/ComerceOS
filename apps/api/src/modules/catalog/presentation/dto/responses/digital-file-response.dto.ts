import { DigitalFile } from '../../../domain/entities/digital-file.entity';

export class DigitalFileResponseDto {
  id!: string;
  fileName!: string;
  sizeBytes!: number;
  contentType!: string;
  maxDownloads!: number;
  createdAt!: Date;

  static fromDomain(file: DigitalFile): DigitalFileResponseDto {
    const dto = new DigitalFileResponseDto();
    dto.id = file.id;
    dto.fileName = file.fileName;
    dto.sizeBytes = file.sizeBytes;
    dto.contentType = file.contentType;
    dto.maxDownloads = file.maxDownloads;
    dto.createdAt = file.createdAt;
    return dto;
  }
}
