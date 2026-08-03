import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { Idempotent } from '../../../../shared/infrastructure/idempotency/idempotent.decorator';
import { CursorQueryDto } from '../../../../shared/presentation/dto/cursor-query.dto';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { WithdrawalService } from '../../application/services/withdrawal.service';
import { WithdrawalReadService } from '../../application/services/withdrawal-read.service';
import { CreateWithdrawalDto } from '../dto/requests/create-withdrawal.dto';
import { WithdrawalResponseDto } from '../dto/responses/withdrawal-response.dto';

@ApiTags('withdrawals')
@Controller('withdrawals')
@UseGuards(StoreOwnerGuard)
export class WithdrawalsController {
  constructor(
    private readonly withdrawals: WithdrawalService,
    private readonly withdrawalReads: WithdrawalReadService,
  ) {}

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: CursorQueryDto,
  ): Promise<CursorPaginated<WithdrawalResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { rows, hasMore } = await this.withdrawalReads.listByStore({
      storeId: store.id,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor({ k: lastRow.requestedAt.toISOString(), i: lastRow.id }) : null;

    return CursorPaginated.of(
      rows.map((row) => WithdrawalResponseDto.fromRow(row)),
      { nextCursor, hasMore },
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Idempotent()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentStore() store: CurrentStorePayload,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    const result = await this.withdrawals.request(store.id, user.id, BigInt(dto.amount));
    return WithdrawalResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Get(':id')
  async detail(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<WithdrawalResponseDto> {
    const result = await this.withdrawalReads.getForStore(store.id, id);
    return WithdrawalResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
