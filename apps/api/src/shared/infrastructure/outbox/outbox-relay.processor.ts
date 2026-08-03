import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { AppConfigService } from '../../config/app-config.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { OutboxRepository } from './outbox.repository';
import { OUTBOX_ROUTES } from './outbox-routing';

@Injectable()
@Processor(QUEUE_NAMES.OUTBOX, { concurrency: 2 })
export class OutboxRelayProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxRelayProcessor.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly config: AppConfigService,
    @InjectQueue(QUEUE_NAMES.PAYMENT) private readonly paymentQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ORDER) private readonly orderQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DELIVERY) private readonly deliveryQueue: Queue,
  ) {
    super();
  }

  private queueFor(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.PAYMENT:
        return this.paymentQueue;
      case QUEUE_NAMES.ORDER:
        return this.orderQueue;
      case QUEUE_NAMES.DELIVERY:
        return this.deliveryQueue;
      default:
        throw new Error(`Outbox relay has no producer wired for queue "${name}"`);
    }
  }

  async process(_job: Job): Promise<void> {
    const claimed = await this.outbox.claimPending(this.config.outboxRelayBatchSize);
    if (claimed.length === 0) return;

    for (const event of claimed) {
      const route = OUTBOX_ROUTES[event.eventType];
      try {
        if (route) {
          const targetQueue = this.queueFor(route.queue);
          await targetQueue.add(route.jobName, event.payload, {
            jobId: `outbox-${event.id}`,
          });
        } else {
          this.logger.debug(`Outbox event "${event.eventType}" (${event.id}) has no consumer route yet`);
        }
        await this.outbox.markPublished(event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to relay outbox event ${event.id} (${event.eventType}): ${message}`);
        await this.outbox.markFailed(event.id, event.attempts, message);
      }
    }
  }
}
