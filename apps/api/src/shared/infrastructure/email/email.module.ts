import { Module } from '@nestjs/common';
import { ResendMailer } from './resend-mailer';

@Module({
  providers: [ResendMailer],
  exports: [ResendMailer],
})
export class EmailModule {}
