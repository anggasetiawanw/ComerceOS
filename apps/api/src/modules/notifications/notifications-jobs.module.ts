import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationQueueProcessor } from './infrastructure/jobs/notification-queue.processor';

@Module({
  imports: [NotificationsModule, LedgerModule],
  providers: [NotificationQueueProcessor],
})
export class NotificationsJobsModule {}
