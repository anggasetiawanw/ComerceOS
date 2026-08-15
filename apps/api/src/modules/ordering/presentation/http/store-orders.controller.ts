import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { Paginated } from '../../../../shared/presentation/dto/paginated.dto';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination-query.dto';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { Idempotent } from '../../../../shared/infrastructure/idempotency/idempotent.decorator';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { USER_REPOSITORY, UserRepository } from '../../../identity/domain/repositories/user.repository';
import { OrderReadService } from '../../application/services/order-read.service';
import { ReleaseOrderService } from '../../application/services/release-order.service';
import { CancelOrderService } from '../../application/services/cancel-order.service';
import { CreateManualOrderService } from '../../application/services/create-manual-order.service';
import { ConfirmManualPaymentService } from '../../application/services/confirm-manual-payment.service';
import { StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';
import { ListStoreOrdersQueryDto } from '../dto/requests/list-store-orders.query.dto';
import { CreateManualOrderDto } from '../dto/requests/create-manual-order.dto';
import { PendingReleaseResponseDto } from '../dto/responses/pending-release-response.dto';
import { OrderResponseDto } from '../dto/responses/order-response.dto';
import { StoreOrderListResponseDto } from '../dto/responses/store-order-list-response.dto';
import { OrderDetailResponseDto } from '../dto/responses/order-detail-response.dto';

// Seller-facing order actions (.docs/05-api-roadmap.md §6.2): the full P0
// order list + detail, manual order creation/payment confirmation for Path
// B, and the manual-mode release work queue from Sprint 6.
@ApiTags('orders')
@Controller('orders')
@UseGuards(StoreOwnerGuard)
export class StoreOrdersController {
  constructor(
    private readonly orderReads: OrderReadService,
    private readonly releaseOrder: ReleaseOrderService,
    private readonly cancelOrder: CancelOrderService,
    private readonly createManualOrder: CreateManualOrderService,
    private readonly confirmManualPayment: ConfirmManualPaymentService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  // Declared before ':id' — Nest matches routes in declaration order, and a
  // literal segment must win over the param route (Sprint 7's lesson).
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

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: ListStoreOrdersQueryDto,
  ): Promise<CursorPaginated<StoreOrderListResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { items, hasMore } = await this.orderReads.listForStore(store.id, {
      status: query.status,
      source: query.source,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      buyerSearch: query.buyerSearch,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? encodeCursor({ k: lastItem.createdAt.toISOString(), i: lastItem.id }) : null;

    return CursorPaginated.of(
      items.map((item) => StoreOrderListResponseDto.fromItem(item)),
      { nextCursor, hasMore },
    );
  }

  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @Idempotent()
  async createManual(
    @CurrentStore() store: CurrentStorePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateManualOrderDto,
  ): Promise<OrderDetailResponseDto> {
    const result = await this.createManualOrder.execute(store.id, user.id, {
      items: dto.items,
      buyerEmail: dto.buyerEmail,
      buyerName: dto.buyerName,
      buyerPhone: dto.buyerPhone ?? null,
    });
    return OrderDetailResponseDto.fromDomain(unwrapOrThrow(result), { name: dto.buyerName, email: dto.buyerEmail });
  }

  @Get(':id')
  async getById(@CurrentStore() store: CurrentStorePayload, @Param('id') id: string): Promise<OrderDetailResponseDto> {
    const result = await this.orderReads.getForStore(id, store.id);
    const order = unwrapOrThrow(result);
    const buyer = await this.users.findById(order.buyerId);
    return OrderDetailResponseDto.fromDomain(order, buyer ? { name: buyer.name, email: buyer.email.value } : null);
  }

  @Post(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @CurrentStore() store: CurrentStorePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    const result = await this.confirmManualPayment.execute(id, user.id, { expectedStoreId: store.id });
    return OrderResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentStore() store: CurrentStorePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    const existing = await this.orderReads.getForStore(id, store.id);
    unwrapOrThrow(existing);
    const result = await this.cancelOrder.execute(id, StatusChangeActor.seller(user.id));
    return OrderResponseDto.fromDomain(unwrapOrThrow(result));
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
