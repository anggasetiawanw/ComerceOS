import { Inquiry as PrismaInquiry, Prisma } from '@prisma/client';
import { Inquiry } from '../../domain/entities/inquiry.aggregate';
import { InquiryStatus } from '../../domain/value-objects/inquiry-status.vo';

export class InquiryMapper {
  static toDomain(row: PrismaInquiry): Inquiry {
    const statusResult = InquiryStatus.create(row.status);
    if (statusResult.isErr()) {
      throw new Error(`Corrupt inquiry row: invalid status for inquiry "${row.id}"`);
    }

    return Inquiry.reconstitute(
      {
        storeId: row.storeId,
        productId: row.productId,
        buyerId: row.buyerId,
        status: statusResult.unwrap(),
        convertedOrderId: row.convertedOrderId,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(inquiry: Inquiry): Prisma.InquiryUncheckedCreateInput {
    return {
      id: inquiry.id,
      storeId: inquiry.storeId,
      productId: inquiry.productId,
      buyerId: inquiry.buyerId,
      status: inquiry.status.value,
      convertedOrderId: inquiry.convertedOrderId,
      createdAt: inquiry.createdAt,
    };
  }

  static toPersistenceUpdate(inquiry: Inquiry): Prisma.InquiryUncheckedUpdateInput {
    return {
      status: inquiry.status.value,
      convertedOrderId: inquiry.convertedOrderId,
    };
  }
}
