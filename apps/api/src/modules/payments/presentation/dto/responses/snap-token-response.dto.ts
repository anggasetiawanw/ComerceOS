import { SnapTransaction } from '../../../../ordering/application/ports/payment-gateway.port';

export class SnapTokenResponseDto {
  token!: string;
  redirectUrl!: string;

  static fromResult(result: SnapTransaction): SnapTokenResponseDto {
    const dto = new SnapTokenResponseDto();
    dto.token = result.token;
    dto.redirectUrl = result.redirectUrl;
    return dto;
  }
}
