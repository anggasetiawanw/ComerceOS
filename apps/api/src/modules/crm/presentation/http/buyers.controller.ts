import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { StoreBuyerService } from '../../application/services/store-buyer.service';
import { StoreBuyerRow } from '../../domain/repositories/store-buyer-read.repository';
import { ListBuyersQueryDto } from '../dto/requests/list-buyers.query.dto';
import { StoreBuyerResponseDto } from '../dto/responses/store-buyer-response.dto';

const sortKeyOf = (row: StoreBuyerRow, sort: ListBuyersQueryDto['sort']): string => {
  if (sort === 'total_spent') return row.totalSpent;
  if (sort === 'total_orders') return row.totalOrders.toString();
  return row.lastPurchaseAt.toISOString();
};

@ApiTags('buyers')
@Controller('buyers')
@UseGuards(StoreOwnerGuard)
export class BuyersController {
  constructor(private readonly storeBuyers: StoreBuyerService) {}

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: ListBuyersQueryDto,
  ): Promise<CursorPaginated<StoreBuyerResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { rows, hasMore } = await this.storeBuyers.list({
      storeId: store.id,
      search: query.search,
      sort: query.sort,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor({ k: sortKeyOf(lastRow, query.sort), i: lastRow.id }) : null;

    return CursorPaginated.of(
      rows.map((row) => StoreBuyerResponseDto.fromRow(row)),
      { nextCursor, hasMore },
    );
  }
}

