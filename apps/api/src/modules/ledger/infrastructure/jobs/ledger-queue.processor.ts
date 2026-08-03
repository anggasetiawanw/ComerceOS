import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { CreditHoldingBalanceJob, ReleaseToAvailableJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { LedgerService } from '../../application/services/ledger.service';

// @nestjs/bullmq creates one BullMQ Worker per @Processor-decorated class.
// Two Worker instances on the same queue name would compete for jobs from
// Redis regardless of job name — a job could be pulled by either worker's
// process(), silently misrouting it. So every job type on the `ledger`
// queue is handled by this one class, dispatched on job.name — the same
// reason release-holding-balance below joins expire-orders in one
// processor on the `order` queue instead of a second class.
//
// .docs/10-background-jobs.md §1: concurrency 1, deliberately — ordering
// matters more than throughput for money movement.
@Injectable()
@Processor(QUEUE_NAMES.LEDGER, { concurrency: 1 })
export class LedgerQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(LedgerQueueProcessor.name);

  constructor(private readonly ledger: LedgerService) {
    super();
  }

  async process(job: Job<CreditHoldingBalanceJob | ReleaseToAvailableJob>): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.CREDIT_HOLDING_BALANCE: {
        const result = await this.ledger.creditHoldingForOrder(job.data.orderId);
        if (result.isErr()) throw result.unwrapErr();
        return;
      }
      case JOB_NAMES.RELEASE_TO_AVAILABLE: {
        const result = await this.ledger.releaseToAvailableForOrder(job.data.orderId);
        if (result.isErr()) throw result.unwrapErr();
        return;
      }
      default:
        this.logger.warn(`Unknown job name "${job.name}" on the ledger queue`);
    }
  }
}
