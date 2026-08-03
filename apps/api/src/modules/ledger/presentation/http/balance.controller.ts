import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CursorQueryDto } from '../../../../shared/presentation/dto/cursor-query.dto';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { BalanceReadService } from '../../application/services/balance-read.service';
import { BalanceResponseDto } from '../dto/responses/balance-response.dto';
import { BalanceTransactionResponseDto } from '../dto/responses/balance-transaction-response.dto';

@ApiTags('balance')
@Controller('balance')
@UseGuards(StoreOwnerGuard)
export class BalanceController {
  constructor(private readonly balanceReads: BalanceReadService) {}

  @Get()
  async getBalance(@CurrentStore() store: CurrentStorePayload): Promise<BalanceResponseDto> {
    const result = await this.balanceReads.getBalance(store.id);
    return BalanceResponseDto.fromSummary(unwrapOrThrow(result));
  }

  @Get('transactions')
  async listTransactions(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: CursorQueryDto,
  ): Promise<CursorPaginated<BalanceTransactionResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { rows, hasMore } = await this.balanceReads.listTransactions({
      storeId: store.id,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor({ k: lastRow.createdAt.toISOString(), i: lastRow.id }) : null;

    return CursorPaginated.of(
      rows.map((row) => BalanceTransactionResponseDto.fromRow(row)),
      { nextCursor, hasMore },
    );
  }
}
