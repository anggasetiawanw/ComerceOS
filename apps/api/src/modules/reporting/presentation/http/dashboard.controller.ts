import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { DashboardSummaryService } from '../../application/services/dashboard-summary.service';
import { DashboardSummaryResponseDto } from '../dto/responses/dashboard-summary-response.dto';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(StoreOwnerGuard)
export class DashboardController {
  constructor(private readonly summary: DashboardSummaryService) {}

  @Get('summary')
  async getSummary(@CurrentStore() store: CurrentStorePayload): Promise<DashboardSummaryResponseDto> {
    const summary = await this.summary.getSummary(store.id);
    return DashboardSummaryResponseDto.fromSummary(summary);
  }
}
