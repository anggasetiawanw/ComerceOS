import { Prisma, DigitalFile as PrismaDigitalFile } from '@prisma/client';
import { DigitalFile } from '../../domain/entities/digital-file.entity';

export class DigitalFileMapper {
  static toDomain(row: PrismaDigitalFile): DigitalFile {
    return DigitalFile.reconstitute(
      {
        productId: row.productId,
        filePath: row.filePath,
        fileName: row.fileName,
        sizeBytes: row.sizeBytes,
        contentType: row.contentType,
        maxDownloads: row.maxDownloads,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(file: DigitalFile): Prisma.DigitalFileUncheckedCreateInput {
    return {
      id: file.id,
      productId: file.productId,
      filePath: file.filePath,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
      maxDownloads: file.maxDownloads,
      createdAt: file.createdAt,
    };
  }

  static toPersistenceUpdate(file: DigitalFile): Prisma.DigitalFileUncheckedUpdateInput {
    return {
      filePath: file.filePath,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
      maxDownloads: file.maxDownloads,
    };
  }
}
