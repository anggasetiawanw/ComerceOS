import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { DeliveryService } from '../../application/services/delivery.service';
import { BuyerDeliveryResponseDto } from '../dto/responses/buyer-delivery-response.dto';
import { DownloadUrlResponseDto } from '../dto/responses/download-url-response.dto';

@ApiTags('deliveries')
@Controller('me/deliveries')
export class DeliveriesController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserPayload): Promise<BuyerDeliveryResponseDto[]> {
    const items = await this.delivery.listForBuyer(user.id);
    return items.map((item) => BuyerDeliveryResponseDto.fromReadModel(item));
  }

  @Post(':id/download')
  @HttpCode(HttpStatus.OK)
  async download(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<DownloadUrlResponseDto> {
    const result = await this.delivery.issueDownloadUrl(id, user.id);
    return DownloadUrlResponseDto.fromResult(unwrapOrThrow(result));
  }
}
