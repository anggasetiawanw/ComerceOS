import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfigService } from '../../config/app-config.service';
import { JOB_NAMES, QUEUE_NAMES, REPEATABLE_JOB_IDS } from './queue.constants';
import { ExpireOrdersJob, RelayOutboxEventsJob, ReleaseHoldingBalanceJob } from './job-payloads';

const EXPIRE_ORDERS_INTERVAL_MS = 10 * 60 * 1_000;
const EXPIRE_ORDERS_BATCH_SIZE = 500;
// .docs/10-background-jobs.md §4: release-holding-balance runs every 15
// minutes, batch-limited and cursor-continued via findReleasableIds — see
// modules/ordering/application/services/release-order.service.ts.
const RELEASE_HOLDING_BALANCE_INTERVAL_MS = 15 * 60 * 1_000;
const RELEASE_HOLDING_BALANCE_BATCH_SIZE = 500;

// Registers repeatable jobs with fixed job IDs so a redeploy of the worker
// never accumulates duplicate schedulers — a classic BullMQ trap that
// silently doubles every scheduled job on each deploy
// (.docs/10-background-jobs.md §4).
@Injectable()
export class RepeatableJobsBootstrap implements OnModuleInit {
  private readonly logger = new Logger(RepeatableJobsBootstrap.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.OUTBOX) private readonly outboxQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ORDER) private readonly orderQueue: Queue,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // BullMQ v6 moved repeatable jobs from add({ repeat }) to Job Schedulers
    // (queue.upsertJobScheduler) — the fixed schedulerId is itself what
    // prevents duplicate schedulers across redeploys, one level more
    // explicit than the old fixed-jobId pattern.
    await this.outboxQueue.upsertJobScheduler(
      REPEATABLE_JOB_IDS.RELAY_OUTBOX_EVENTS,
      { every: this.config.outboxRelayIntervalMs },
      { name: JOB_NAMES.RELAY_OUTBOX_EVENTS, data: { batchSize: this.config.outboxRelayBatchSize } satisfies RelayOutboxEventsJob },
    );

    await this.orderQueue.upsertJobScheduler(
      REPEATABLE_JOB_IDS.EXPIRE_ORDERS,
      { every: EXPIRE_ORDERS_INTERVAL_MS },
      { name: JOB_NAMES.EXPIRE_ORDERS, data: { batchSize: EXPIRE_ORDERS_BATCH_SIZE } satisfies ExpireOrdersJob },
    );

    await this.orderQueue.upsertJobScheduler(
      REPEATABLE_JOB_IDS.RELEASE_HOLDING_BALANCE,
      { every: RELEASE_HOLDING_BALANCE_INTERVAL_MS },
      {
        name: JOB_NAMES.RELEASE_HOLDING_BALANCE,
        data: { batchSize: RELEASE_HOLDING_BALANCE_BATCH_SIZE } satisfies ReleaseHoldingBalanceJob,
      },
    );

    this.logger.log(
      'Repeatable jobs registered: relay-outbox-events (2s), expire-orders (10min), release-holding-balance (15min)',
    );
  }
}
