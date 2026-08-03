import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { Paginated } from '../../../../shared/presentation/dto/paginated.dto';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination-query.dto';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { OrderReadService } from '../../application/services/order-read.service';
import { ReleaseOrderService } from '../../application/services/release-order.service';
import { StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';
import { PendingReleaseResponseDto } from '../dto/responses/pending-release-response.dto';
import { OrderResponseDto } from '../dto/responses/order-response.dto';

// Seller-facing order actions this sprint adds: the manual-mode release
// work queue and the manual release action itself (.docs/05-api-roadmap.md
// §"Orders"). The seller-facing /orders list (all statuses, cursor
// paginated) is not part of Sprint 6's scope.
@ApiTags('orders')
@Controller('orders')
@UseGuards(StoreOwnerGuard)
export class StoreOrdersController {
  constructor(
    private readonly orderReads: OrderReadService,
    private readonly releaseOrder: ReleaseOrderService,
  ) {}

  @Get('pending-release')
  async listPendingRelease(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<PendingReleaseResponseDto>> {
    const result = await this.orderReads.listPendingRelease(store.id, { page: query.page, limit: query.limit });
    return Paginated.of(
      result.items.map((item) => PendingReleaseResponseDto.fromItem(item)),
      { page: query.page, limit: query.limit, total: result.total },
    );
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  async release(
    @CurrentStore() store: CurrentStorePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    const result = await this.releaseOrder.execute(id, StatusChangeActor.seller(user.id), { expectedStoreId: store.id });
    return OrderResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
