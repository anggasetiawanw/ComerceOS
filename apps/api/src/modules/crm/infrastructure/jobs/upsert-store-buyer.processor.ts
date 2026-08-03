import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { UpsertStoreBuyerJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { StoreBuyerService } from '../../application/services/store-buyer.service';

@Injectable()
@Processor(QUEUE_NAMES.CRM, { concurrency: 3 })
export class UpsertStoreBuyerProcessor extends WorkerHost {
  constructor(private readonly storeBuyers: StoreBuyerService) {
    super();
  }

  async process(job: Job<UpsertStoreBuyerJob>): Promise<void> {
    await this.storeBuyers.upsertFromPaidOrder(job.data.storeId, job.data.buyerId);
  }
}
