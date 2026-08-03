import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { SendEmailJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { StorageBucket } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { NOTIFICATION_CHANNELS, NotificationChannel, Recipient } from '../ports/notification-channel.port';
import { NOTIFICATION_DELIVERY_REPOSITORY, NotificationDeliveryRepository } from '../../domain/repositories/notification-delivery.repository';
import { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';

export interface DispatchAttachment {
  storageBucket: StorageBucket;
  storagePath: string;
  filename: string;
}

// Row-first: every dispatch writes a notification_deliveries row (status
// 'pending' or 'skipped') BEFORE anything is queued, so a crash right after
// this call still leaves an auditable record (.docs/10 §3). The rendered
// HTML itself is not persisted — SendEmailProcessor re-renders from
// template+payload, which is why an attachment is passed as a storage
// reference (bucket/path/filename) rather than raw bytes: bytes don't
// belong in a jsonb column, and the processor downloads them at send time.
@Injectable()
export class NotificationDispatcher {
  constructor(
    @Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[],
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY) private readonly deliveries: NotificationDeliveryRepository,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly notificationQueue: Queue,
  ) {}

  async dispatch(params: {
    template: string;
    recipient: Recipient;
    payload: Record<string, unknown>;
    attachment?: DispatchAttachment;
  }): Promise<void> {
    const applicableChannels = this.channels.filter((channel) => channel.supports(params.recipient));

    if (applicableChannels.length === 0) {
      const skipped = NotificationDelivery.skipped({
        channel: 'email',
        provider: 'none',
        recipient: params.recipient.email ?? params.recipient.phone ?? 'unknown',
        template: params.template,
        payload: params.payload,
        reason: 'No channel supports this recipient',
      });
      await this.deliveries.save(skipped);
      return;
    }

    const payload: Record<string, unknown> = params.attachment
      ? {
          ...params.payload,
          attachmentStorageBucket: params.attachment.storageBucket,
          attachmentStoragePath: params.attachment.storagePath,
          attachmentFilename: params.attachment.filename,
        }
      : params.payload;

    for (const channel of applicableChannels) {
      const address = channel.type === 'email' ? params.recipient.email : params.recipient.phone;
      const delivery = NotificationDelivery.create({
        channel: channel.type,
        provider: channel.provider,
        recipient: address ?? 'unknown',
        template: params.template,
        payload,
      });
      await this.deliveries.save(delivery);

      if (channel.type === 'email') {
        await this.notificationQueue.add(JOB_NAMES.SEND_EMAIL, { deliveryId: delivery.id } satisfies SendEmailJob, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
        });
      }
      // WhatsApp dispatch is Sprint 9 — the port and this loop already
      // support it, but no job consumes a 'whatsapp'-channel delivery yet.
    }
  }
}
