import { Module } from '@nestjs/common';
import { AuditModule } from './audit.module';
import { LedgerModule } from '../ledger/ledger.module';
import { StoreModule } from '../store/store.module';
import { OrderingModule } from '../ordering/ordering.module';
import { AdminWithdrawalService } from './application/services/admin-withdrawal.service';
import { PlatformMetricsService } from './application/services/platform-metrics.service';
import { AdminWithdrawalsController } from './presentation/http/admin-withdrawals.controller';
import { AdminMetricsController } from './presentation/http/admin-metrics.controller';
import { AdminAuditController } from './presentation/http/admin-audit.controller';

@Module({
  imports: [AuditModule, LedgerModule, StoreModule, OrderingModule],
  controllers: [AdminWithdrawalsController, AdminMetricsController, AdminAuditController],
  providers: [AdminWithdrawalService, PlatformMetricsService],
})
export class AdministrationModule {}
