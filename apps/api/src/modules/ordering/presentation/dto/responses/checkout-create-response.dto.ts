import { CheckoutCreateResult } from '../../../application/services/checkout.service';
import { OrderResponseDto } from './order-response.dto';

export class CheckoutCreateResponseDto {
  order!: OrderResponseDto;
  snapToken!: string | null;
  snapRedirectUrl!: string | null;

  static fromResult(result: CheckoutCreateResult): CheckoutCreateResponseDto {
    const dto = new CheckoutCreateResponseDto();
    dto.order = OrderResponseDto.fromDomain(result.order);
    dto.snapToken = result.snapToken;
    dto.snapRedirectUrl = result.snapRedirectUrl;
    return dto;
  }
}
