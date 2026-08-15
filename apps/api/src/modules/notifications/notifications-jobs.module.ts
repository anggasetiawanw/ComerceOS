import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';
import { LedgerModule } from '../ledger/ledger.module';
import { OrderingModule } from '../ordering/ordering.module';
import { NotificationQueueProcessor } from './infrastructure/jobs/notification-queue.processor';

@Module({
  imports: [NotificationsModule, LedgerModule, OrderingModule],
  providers: [NotificationQueueProcessor],
})
export class NotificationsJobsModule {}
