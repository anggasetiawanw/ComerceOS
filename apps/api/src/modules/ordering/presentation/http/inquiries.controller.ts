import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { Paginated } from '../../../../shared/presentation/dto/paginated.dto';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { INQUIRY_READ_REPOSITORY, InquiryReadRepository } from '../../domain/repositories/inquiry-read.repository';
import { ConvertInquiryService } from '../../application/services/convert-inquiry.service';
import { MarkInquiryLostService } from '../../application/services/mark-inquiry-lost.service';
import { ListInquiriesQueryDto } from '../dto/requests/list-inquiries.query.dto';
import { CreateManualOrderDto } from '../dto/requests/create-manual-order.dto';
import { InquiryResponseDto } from '../dto/responses/inquiry-response.dto';
import { OrderDetailResponseDto } from '../dto/responses/order-detail-response.dto';

@ApiTags('inquiries')
@Controller('inquiries')
@UseGuards(StoreOwnerGuard)
export class InquiriesController {
  constructor(
    @Inject(INQUIRY_READ_REPOSITORY) private readonly inquiryReads: InquiryReadRepository,
    private readonly convertInquiry: ConvertInquiryService,
    private readonly markInquiryLost: MarkInquiryLostService,
  ) {}

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: ListInquiriesQueryDto,
  ): Promise<Paginated<InquiryResponseDto>> {
    const result = await this.inquiryReads.listByStore(store.id, {
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
    return Paginated.of(
      result.items.map((item) => InquiryResponseDto.fromListItem(item)),
      { page: query.page, limit: query.limit, total: result.total },
    );
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.CREATED)
  async convert(
    @CurrentStore() store: CurrentStorePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateManualOrderDto,
  ): Promise<OrderDetailResponseDto> {
    const result = await this.convertInquiry.execute(id, user.id, {
      expectedStoreId: store.id,
      items: dto.items,
      buyerEmail: dto.buyerEmail,
      buyerName: dto.buyerName,
      buyerPhone: dto.buyerPhone ?? null,
    });
    return OrderDetailResponseDto.fromDomain(unwrapOrThrow(result), { name: dto.buyerName, email: dto.buyerEmail });
  }

  @Post(':id/mark-lost')
  @HttpCode(HttpStatus.OK)
  async markLost(@CurrentStore() store: CurrentStorePayload, @Param('id') id: string): Promise<InquiryResponseDto> {
    const result = await this.markInquiryLost.execute(id, store.id);
    return InquiryResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
