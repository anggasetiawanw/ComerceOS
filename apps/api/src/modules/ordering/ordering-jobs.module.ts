import { Module } from '@nestjs/common';
import { OrderingModule } from './ordering.module';
import { OrderQueueProcessor } from './infrastructure/jobs/order-queue.processor';

// Worker-only — see PaymentsJobsModule for why job consumers live in a
// separate module from the feature module's controllers/services.
@Module({
  imports: [OrderingModule],
  providers: [OrderQueueProcessor],
})
export class OrderingJobsModule {}
