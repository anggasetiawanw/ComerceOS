import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { ExpireOrdersJob, ReleaseHoldingBalanceJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { ExpireOrderService } from '../../application/services/expire-order.service';
import { ReleaseOrderService } from '../../application/services/release-order.service';

// @nestjs/bullmq creates one BullMQ Worker per @Processor-decorated class.
// Two Worker instances on the same queue name would compete for jobs from
// Redis regardless of job name, silently misrouting them — so every job
// type on the `order` queue (expire-orders, release-holding-balance) is
// handled by this one class, dispatched on job.name.
@Injectable()
@Processor(QUEUE_NAMES.ORDER, { concurrency: 3 })
export class OrderQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderQueueProcessor.name);

  constructor(
    private readonly expireOrder: ExpireOrderService,
    private readonly releaseOrder: ReleaseOrderService,
  ) {
    super();
  }

  async process(job: Job<ExpireOrdersJob | ReleaseHoldingBalanceJob>): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.EXPIRE_ORDERS: {
        const result = await this.expireOrder.expireBatch(job.data.batchSize);
        this.logger.log(`expire-orders: ${result.expired} expired, ${result.failed} failed`);
        return;
      }
      case JOB_NAMES.RELEASE_HOLDING_BALANCE: {
        const result = await this.releaseOrder.releaseBatch(job.data.batchSize);
        this.logger.log(`release-holding-balance: ${result.released} released, ${result.skipped} skipped, ${result.failed} failed`);
        return;
      }
      default:
        this.logger.warn(`Unknown job name "${job.name}" on the order queue`);
    }
  }
}
