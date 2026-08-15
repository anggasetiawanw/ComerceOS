import { CreateInquiryResult } from '../../../application/services/create-inquiry.service';

export class CreateInquiryResponseDto {
  inquiryId!: string;
  waLink!: string | null;

  static fromResult(result: CreateInquiryResult): CreateInquiryResponseDto {
    const dto = new CreateInquiryResponseDto();
    dto.inquiryId = result.inquiryId;
    dto.waLink = result.waLink;
    return dto;
  }
}
