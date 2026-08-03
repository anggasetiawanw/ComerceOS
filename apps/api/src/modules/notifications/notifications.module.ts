import { Module } from '@nestjs/common';
import { QueueModule } from '../../shared/infrastructure/queue/queue.module';
import { EmailModule } from '../../shared/infrastructure/email/email.module';
import { NOTIFICATION_CHANNELS, NotificationChannel } from './application/ports/notification-channel.port';
import { NOTIFICATION_DELIVERY_REPOSITORY } from './domain/repositories/notification-delivery.repository';
import { NotificationDeliveryPrismaRepository } from './infrastructure/persistence/notification-delivery.prisma.repository';
import { EmailChannel } from './infrastructure/channels/email.channel';
import { TemplateRenderer } from './application/services/template-renderer.service';
import { NotificationDispatcher } from './application/services/notification-dispatcher.service';
import { SendEmailService } from './application/services/send-email.service';

@Module({
  imports: [EmailModule, QueueModule],
  providers: [
    EmailChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (email: EmailChannel): NotificationChannel[] => [email],
      inject: [EmailChannel],
    },
    { provide: NOTIFICATION_DELIVERY_REPOSITORY, useClass: NotificationDeliveryPrismaRepository },
    TemplateRenderer,
    NotificationDispatcher,
    SendEmailService,
  ],
  exports: [NotificationDispatcher, TemplateRenderer, EmailChannel, NOTIFICATION_DELIVERY_REPOSITORY, SendEmailService],
})
export class NotificationsModule {}
