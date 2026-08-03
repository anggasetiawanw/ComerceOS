import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { AppConfigService } from '../../config/app-config.service';
import { QUEUE_NAMES, QueueName } from '../queue/queue.constants';
import { OutboxRepository } from './outbox.repository';
import { OUTBOX_ROUTES } from './outbox-routing';

@Injectable()
@Processor(QUEUE_NAMES.OUTBOX, { concurrency: 2 })
export class OutboxRelayProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxRelayProcessor.name);
  private readonly queuesByName: ReadonlyMap<QueueName, Queue>;

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly config: AppConfigService,
    @InjectQueue(QUEUE_NAMES.PAYMENT) paymentQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ORDER) orderQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DELIVERY) deliveryQueue: Queue,
    @InjectQueue(QUEUE_NAMES.LEDGER) ledgerQueue: Queue,
    @InjectQueue(QUEUE_NAMES.INVOICE) invoiceQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CRM) crmQueue: Queue,
  ) {
    super();
    this.queuesByName = new Map([
      [QUEUE_NAMES.PAYMENT, paymentQueue],
      [QUEUE_NAMES.ORDER, orderQueue],
      [QUEUE_NAMES.DELIVERY, deliveryQueue],
      [QUEUE_NAMES.LEDGER, ledgerQueue],
      [QUEUE_NAMES.INVOICE, invoiceQueue],
      [QUEUE_NAMES.NOTIFICATION, notificationQueue],
      [QUEUE_NAMES.CRM, crmQueue],
    ]);
  }

  private queueFor(name: QueueName): Queue {
    const queue = this.queuesByName.get(name);
    if (!queue) {
      throw new Error(`Outbox relay has no producer wired for queue "${name}"`);
    }
    return queue;
  }

  async process(_job: Job): Promise<void> {
    const claimed = await this.outbox.claimPending(this.config.outboxRelayBatchSize);
    if (claimed.length === 0) return;

    for (const event of claimed) {
      const routes = OUTBOX_ROUTES[event.eventType];
      try {
        if (routes) {
          for (const route of routes) {
            const targetQueue = this.queueFor(route.queue);
            // Deterministic id: an event that fails partway through fan-out
            // (route 3 of 4 throws) gets retried by markFailed below, and
            // this jobId lets BullMQ dedupe the routes already added on the
            // retry instead of double-enqueueing them.
            await targetQueue.add(route.jobName, event.payload, {
              jobId: `outbox-${event.id}-${route.jobName}`,
              ...(route.opts ? { attempts: route.opts.attempts, backoff: route.opts.backoff } : {}),
            });
          }
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
