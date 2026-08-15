import { IsOptional, IsString } from 'class-validator';

export class CreateInquiryDto {
  @IsOptional()
  @IsString()
  productId?: string;
}
