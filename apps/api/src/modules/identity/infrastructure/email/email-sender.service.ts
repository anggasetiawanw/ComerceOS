import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { EmailSender } from '../../application/ports/email-sender.port';

@Injectable()
export class ResendEmailSenderService implements EmailSender {
  private readonly logger = new Logger(ResendEmailSenderService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: AppConfigService) {
    this.resend = this.config.resendApiKey ? new Resend(this.config.resendApiKey) : null;
  }

  async sendVerificationEmail(params: { to: string; name: string; token: string }): Promise<void> {
    const link = `${this.config.frontendUrl}/verifikasi-email?token=${params.token}`;
    await this.send({
      to: params.to,
      subject: 'Verifikasi email Nagihin Anda',
      link,
      html: `<p>Halo ${params.name},</p><p>Klik tautan berikut untuk memverifikasi email Anda (berlaku 24 jam):</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  async sendPasswordResetEmail(params: { to: string; name: string; token: string }): Promise<void> {
    const link = `${this.config.frontendUrl}/reset-password?token=${params.token}`;
    await this.send({
      to: params.to,
      subject: 'Atur ulang kata sandi Nagihin Anda',
      link,
      html: `<p>Halo ${params.name},</p><p>Klik tautan berikut untuk atur ulang kata sandi Anda (berlaku 1 jam). Abaikan email ini jika Anda tidak meminta ini:</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  private async send(params: { to: string; subject: string; link: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.log({ to: params.to, subject: params.subject, link: params.link }, '[dry-run] email');
      return;
    }

    await this.resend.emails.send({
      from: this.config.emailFromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  }
}
