import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { ResendMailer } from '../../../../shared/infrastructure/email/resend-mailer';
import { EmailSender } from '../../application/ports/email-sender.port';

@Injectable()
export class ResendEmailSenderService implements EmailSender {
  constructor(
    private readonly mailer: ResendMailer,
    private readonly config: AppConfigService,
  ) {}

  async sendVerificationEmail(params: { to: string; name: string; token: string }): Promise<void> {
    const link = `${this.config.frontendUrl}/verifikasi-email?token=${params.token}`;
    await this.mailer.send({
      to: params.to,
      subject: 'Verifikasi email Nagihin Anda',
      html: `<p>Halo ${params.name},</p><p>Klik tautan berikut untuk memverifikasi email Anda (berlaku 24 jam):</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  async sendPasswordResetEmail(params: { to: string; name: string; token: string }): Promise<void> {
    const link = `${this.config.frontendUrl}/reset-password?token=${params.token}`;
    await this.mailer.send({
      to: params.to,
      subject: 'Atur ulang kata sandi Nagihin Anda',
      html: `<p>Halo ${params.name},</p><p>Klik tautan berikut untuk atur ulang kata sandi Anda (berlaku 1 jam). Abaikan email ini jika Anda tidak meminta ini:</p><p><a href="${link}">${link}</a></p>`,
    });
  }
}
