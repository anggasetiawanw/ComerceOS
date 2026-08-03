import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { SendEmailJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { SendEmailService } from '../../application/services/send-email.service';

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATION, { concurrency: 10 })
export class SendEmailProcessor extends WorkerHost {
  constructor(private readonly sendEmail: SendEmailService) {
    super();
  }

  async process(job: Job<SendEmailJob>): Promise<void> {
    await this.sendEmail.send(job.data.deliveryId);
  }
}
