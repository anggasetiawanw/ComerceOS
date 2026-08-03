import { Injectable } from '@nestjs/common';
import { ResendMailer } from '../../../../shared/infrastructure/email/resend-mailer';
import { DeliveryResult, NotificationChannel, Recipient, RenderedMessage } from '../../application/ports/notification-channel.port';

@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly type = 'email' as const;
  readonly provider = 'resend';

  constructor(private readonly mailer: ResendMailer) {}

  supports(recipient: Recipient): boolean {
    return recipient.email !== null;
  }

  async send(recipient: Recipient, message: RenderedMessage): Promise<DeliveryResult> {
    if (!recipient.email) {
      return { provider: this.provider, success: false, error: 'Recipient has no email address' };
    }

    try {
      await this.mailer.send({
        to: recipient.email,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments,
      });
      return { provider: this.provider, success: true };
    } catch (error) {
      return { provider: this.provider, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
