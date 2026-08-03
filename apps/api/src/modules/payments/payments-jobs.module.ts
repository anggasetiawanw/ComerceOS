import { Module } from '@nestjs/common';
import { PaymentsModule } from './payments.module';
import { ProcessWebhookProcessor } from './infrastructure/jobs/process-webhook.processor';

// Worker-only: registers the BullMQ consumer for the `payment` queue. Kept
// out of PaymentsModule itself so importing PaymentsModule from the HTTP
// API process (for its controllers) never also spins up a competing job
// consumer there — job processing must stay isolated to the worker process
// (.docs/02-architecture.md §6).
@Module({
  imports: [PaymentsModule],
  providers: [ProcessWebhookProcessor],
})
export class PaymentsJobsModule {}
