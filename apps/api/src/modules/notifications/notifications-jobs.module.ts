import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications.module';
import { SendEmailProcessor } from './infrastructure/jobs/send-email.processor';

@Module({
  imports: [NotificationsModule],
  providers: [SendEmailProcessor],
})
export class NotificationsJobsModule {}
