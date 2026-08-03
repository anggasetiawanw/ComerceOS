import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfigService } from '../../config/app-config.service';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

// The one Resend client for the whole app. Both identity's EMAIL_SENDER
// port (verification/reset emails) and modules/notifications' EmailChannel
// delegate here, rather than each holding its own Resend instance and
// dry-run logic.
@Injectable()
export class ResendMailer {
  private readonly logger = new Logger(ResendMailer.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: AppConfigService) {
    this.resend = this.config.resendApiKey ? new Resend(this.config.resendApiKey) : null;
  }

  async send(params: SendMailParams): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        { to: params.to, subject: params.subject, attachments: params.attachments?.map((a) => a.filename) },
        '[dry-run] email',
      );
      return;
    }

    await this.resend.emails.send({
      from: this.config.emailFromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.attachments
        ? { attachments: params.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    });
  }
}
