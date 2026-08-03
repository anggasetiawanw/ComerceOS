import { Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { SnapTokenService } from '../../application/services/snap-token.service';
import { SnapTokenResponseDto } from '../dto/responses/snap-token-response.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly snapToken: SnapTokenService) {}

  @Post('orders/:orderId/snap-token')
  async reissue(
    @CurrentUser() user: CurrentUserPayload,
    @Param('orderId') orderId: string,
  ): Promise<SnapTokenResponseDto> {
    const result = await this.snapToken.reissue(user.id, orderId);
    return SnapTokenResponseDto.fromResult(unwrapOrThrow(result));
  }
}
