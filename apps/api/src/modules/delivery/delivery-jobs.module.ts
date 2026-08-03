import { Module } from '@nestjs/common';
import { DeliveryModule } from './delivery.module';
import { ProvisionDigitalDeliveryProcessor } from './infrastructure/jobs/provision-digital-delivery.processor';

// Worker-only — see PaymentsJobsModule for why job consumers live in a
// separate module from the feature module's controllers/services.
@Module({
  imports: [DeliveryModule],
  providers: [ProvisionDigitalDeliveryProcessor],
})
export class DeliveryJobsModule {}
