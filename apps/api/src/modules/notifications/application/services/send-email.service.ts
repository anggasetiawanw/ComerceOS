import { Inject, Injectable, Logger } from '@nestjs/common';
import { STORAGE_UPLOADER, StorageBucket, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NotificationDeliveryRepository,
} from '../../domain/repositories/notification-delivery.repository';
import { TemplateRenderer } from './template-renderer.service';
import { EmailChannel } from '../../infrastructure/channels/email.channel';

interface AttachmentRef {
  bucket: StorageBucket;
  path: string;
  filename: string;
}

const isStorageBucket = (value: unknown): value is StorageBucket => value === 'public' || value === 'private';

const attachmentRefFrom = (payload: Record<string, unknown>): AttachmentRef | null => {
  const { attachmentStorageBucket, attachmentStoragePath, attachmentFilename } = payload;
  if (
    isStorageBucket(attachmentStorageBucket) &&
    typeof attachmentStoragePath === 'string' &&
    typeof attachmentFilename === 'string'
  ) {
    return { bucket: attachmentStorageBucket, path: attachmentStoragePath, filename: attachmentFilename };
  }
  return null;
};

// The logic behind the send-email job, separated from the BullMQ glue
// (NotificationQueueProcessor) so it's callable directly — from a test, or from any
// future non-queue caller — without needing to construct a bullmq Job.
@Injectable()
export class SendEmailService {
  private readonly logger = new Logger(SendEmailService.name);

  constructor(
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY) private readonly deliveries: NotificationDeliveryRepository,
    private readonly templates: TemplateRenderer,
    private readonly emailChannel: EmailChannel,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
  ) {}

  async send(deliveryId: string): Promise<void> {
    const delivery = await this.deliveries.findById(deliveryId);
    if (!delivery) {
      this.logger.warn(`send-email: delivery "${deliveryId}" not found — nothing to send`);
      return;
    }
    if (delivery.status === 'sent') return;

    const message = this.templates.render(delivery.template, delivery.payload);
    const attachmentRef = attachmentRefFrom(delivery.payload);
    if (attachmentRef) {
      const content = await this.storage.download({ bucket: attachmentRef.bucket, path: attachmentRef.path });
      message.attachments = [{ filename: attachmentRef.filename, content }];
    }

    const result = await this.emailChannel.send({ email: delivery.recipient, phone: null }, message);
    if (result.success) {
      delivery.markSent();
    } else {
      delivery.markFailed(result.error ?? 'Unknown email delivery failure');
    }
    await this.deliveries.save(delivery);

    if (!result.success) {
      throw new Error(result.error ?? 'Unknown email delivery failure');
    }
  }
}
