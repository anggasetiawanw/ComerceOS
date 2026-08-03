import { Module } from '@nestjs/common';
import { OrderingModule } from './ordering.module';
import { ExpireOrdersProcessor } from './infrastructure/jobs/expire-orders.processor';

// Worker-only — see PaymentsJobsModule for why job consumers live in a
// separate module from the feature module's controllers/services.
@Module({
  imports: [OrderingModule],
  providers: [ExpireOrdersProcessor],
})
export class OrderingJobsModule {}
