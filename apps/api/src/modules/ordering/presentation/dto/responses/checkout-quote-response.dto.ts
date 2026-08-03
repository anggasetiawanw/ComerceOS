import { CheckoutQuoteResult } from '../../../application/services/checkout.service';

export class CheckoutQuoteResponseDto {
  subtotal!: string;
  discountAmount!: string;
  total!: string;
  feeAmount!: string;

  static fromResult(result: CheckoutQuoteResult): CheckoutQuoteResponseDto {
    const dto = new CheckoutQuoteResponseDto();
    dto.subtotal = result.subtotal;
    dto.discountAmount = result.discountAmount;
    dto.total = result.total;
    dto.feeAmount = result.feeAmount;
    return dto;
  }
}
