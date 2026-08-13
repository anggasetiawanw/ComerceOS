import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { DashboardSummaryService } from './application/services/dashboard-summary.service';
import { DashboardController } from './presentation/http/dashboard.controller';

@Module({
  imports: [StoreModule],
  controllers: [DashboardController],
  providers: [DashboardSummaryService],
})
export class ReportingModule {}
