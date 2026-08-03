import { Module } from '@nestjs/common';
import { InvoicingModule } from './invoicing.module';
import { InvoiceQueueProcessor } from './infrastructure/jobs/invoice-queue.processor';

@Module({
  imports: [InvoicingModule],
  providers: [InvoiceQueueProcessor],
})
export class InvoicingJobsModule {}
