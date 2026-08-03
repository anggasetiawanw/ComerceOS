import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { ExpireOrdersJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { ExpireOrderService } from '../../application/services/expire-order.service';

@Injectable()
@Processor(QUEUE_NAMES.ORDER, { concurrency: 3 })
export class ExpireOrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpireOrdersProcessor.name);

  constructor(private readonly expireOrder: ExpireOrderService) {
    super();
  }

  async process(job: Job<ExpireOrdersJob>): Promise<void> {
    const result = await this.expireOrder.expireBatch(job.data.batchSize);
    this.logger.log(`expire-orders: ${result.expired} expired, ${result.failed} failed`);
  }
}
