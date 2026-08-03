import { DigitalDelivery as PrismaDigitalDelivery, Prisma } from '@prisma/client';
import { DigitalDelivery } from '../../domain/entities/digital-delivery.aggregate';
import { DownloadAllowance } from '../../domain/value-objects/download-allowance.vo';

export class DigitalDeliveryMapper {
  static toDomain(row: PrismaDigitalDelivery): DigitalDelivery {
    const allowanceResult = DownloadAllowance.create(row.downloadCount, row.maxDownloads);
    if (allowanceResult.isErr()) {
      throw new Error(`Corrupt digital delivery row: invalid allowance for delivery "${row.id}"`);
    }

    return DigitalDelivery.reconstitute(
      {
        orderItemId: row.orderItemId,
        filePath: row.filePath,
        allowance: allowanceResult.unwrap(),
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(delivery: DigitalDelivery): Prisma.DigitalDeliveryUncheckedCreateInput {
    return {
      id: delivery.id,
      orderItemId: delivery.orderItemId,
      filePath: delivery.filePath,
      downloadCount: delivery.allowance.count,
      maxDownloads: delivery.allowance.max,
      expiresAt: delivery.expiresAt,
      createdAt: delivery.createdAt,
    };
  }

  static toPersistenceUpdate(delivery: DigitalDelivery): Prisma.DigitalDeliveryUncheckedUpdateInput {
    return {
      downloadCount: delivery.allowance.count,
      expiresAt: delivery.expiresAt,
    };
  }
}
