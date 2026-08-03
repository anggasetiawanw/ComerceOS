import { Module } from '@nestjs/common';
import { LedgerModule } from './ledger.module';
import { LedgerQueueProcessor } from './infrastructure/jobs/ledger-queue.processor';

@Module({
  imports: [LedgerModule],
  providers: [LedgerQueueProcessor],
})
export class LedgerJobsModule {}
