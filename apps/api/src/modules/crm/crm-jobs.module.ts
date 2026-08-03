import { Module } from '@nestjs/common';
import { CrmModule } from './crm.module';
import { UpsertStoreBuyerProcessor } from './infrastructure/jobs/upsert-store-buyer.processor';

@Module({
  imports: [CrmModule],
  providers: [UpsertStoreBuyerProcessor],
})
export class CrmJobsModule {}
