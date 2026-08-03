import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { ProcessWebhookJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { WebhookProcessingService } from '../../application/services/webhook-processing.service';

@Injectable()
@Processor(QUEUE_NAMES.PAYMENT, { concurrency: 5 })
export class ProcessWebhookProcessor extends WorkerHost {
  constructor(private readonly webhookProcessing: WebhookProcessingService) {
    super();
  }

  async process(job: Job<ProcessWebhookJob>): Promise<void> {
    await this.webhookProcessing.process(job.data.webhookEventId);
  }
}
