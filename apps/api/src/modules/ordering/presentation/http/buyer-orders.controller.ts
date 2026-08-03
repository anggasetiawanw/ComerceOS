import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { Paginated } from '../../../../shared/presentation/dto/paginated.dto';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination-query.dto';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { OrderReadService } from '../../application/services/order-read.service';
import { BuyerOrderListItemResponseDto } from '../dto/responses/buyer-order-response.dto';
import { OrderResponseDto } from '../dto/responses/order-response.dto';

@ApiTags('orders')
@Controller('me/orders')
export class BuyerOrdersController {
  constructor(private readonly orderRead: OrderReadService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<BuyerOrderListItemResponseDto>> {
    const result = await this.orderRead.listForBuyer(user.id, { page: query.page, limit: query.limit });
    return Paginated.of(
      result.items.map((item) => BuyerOrderListItemResponseDto.fromReadModel(item)),
      { page: query.page, limit: query.limit, total: result.total },
    );
  }

  @Get(':id')
  async getById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<OrderResponseDto> {
    const result = await this.orderRead.getForBuyer(user.id, id);
    return OrderResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
