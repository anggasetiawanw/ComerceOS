import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CursorPaginated } from '../../../../shared/presentation/dto/cursor-paginated.dto';
import { CursorQueryDto } from '../../../../shared/presentation/dto/cursor-query.dto';
import { decodeCursor, encodeCursor } from '../../../../shared/kernel/cursor';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { InvoiceReadService } from '../../application/services/invoice-read.service';
import { InvoicePdfResponseDto, InvoiceResponseDto } from '../dto/responses/invoice-response.dto';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(StoreOwnerGuard)
export class InvoicesController {
  constructor(private readonly invoiceReads: InvoiceReadService) {}

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: CursorQueryDto,
  ): Promise<CursorPaginated<InvoiceResponseDto>> {
    const cursor = query.cursor ? unwrapOrThrow(decodeCursor(query.cursor)) : undefined;

    const { rows, hasMore } = await this.invoiceReads.listByStore({
      storeId: store.id,
      limit: query.limit,
      cursor: cursor ? { sortValue: cursor.k, id: cursor.i } : undefined,
    });

    const lastRow = rows[rows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor({ k: lastRow.createdAt.toISOString(), i: lastRow.id }) : null;

    return CursorPaginated.of(
      rows.map((row) => InvoiceResponseDto.fromRow(row)),
      { nextCursor, hasMore },
    );
  }

  @Get(':id')
  async getById(@CurrentStore() store: CurrentStorePayload, @Param('id') id: string): Promise<InvoiceResponseDto> {
    const result = await this.invoiceReads.getForStore(id, store.id);
    return InvoiceResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Get(':id/pdf')
  async getPdfUrl(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<InvoicePdfResponseDto> {
    const result = await this.invoiceReads.getSignedPdfUrlForStore(id, store.id);
    const { url, expiresAt } = unwrapOrThrow(result);
    return InvoicePdfResponseDto.of(url, expiresAt);
  }
}
