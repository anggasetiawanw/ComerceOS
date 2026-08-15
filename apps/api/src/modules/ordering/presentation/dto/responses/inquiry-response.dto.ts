import { InquiryListItem } from '../../../domain/repositories/inquiry-read.repository';
import { Inquiry } from '../../../domain/entities/inquiry.aggregate';

export class InquiryResponseDto {
  id!: string;
  status!: string;
  productId!: string | null;
  productName!: string | null;
  buyerName!: string | null;
  buyerEmail!: string | null;
  createdAt!: Date;

  static fromListItem(item: InquiryListItem): InquiryResponseDto {
    const dto = new InquiryResponseDto();
    dto.id = item.id;
    dto.status = item.status;
    dto.productId = item.productId;
    dto.productName = item.productName;
    dto.buyerName = item.buyerName;
    dto.buyerEmail = item.buyerEmail;
    dto.createdAt = item.createdAt;
    return dto;
  }

  static fromDomain(inquiry: Inquiry): InquiryResponseDto {
    const dto = new InquiryResponseDto();
    dto.id = inquiry.id;
    dto.status = inquiry.status.value;
    dto.productId = inquiry.productId;
    dto.productName = null;
    dto.buyerName = null;
    dto.buyerEmail = null;
    dto.createdAt = inquiry.createdAt;
    return dto;
  }
}
