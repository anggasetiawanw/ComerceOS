import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Result } from '../../../../shared/kernel/result';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../shared/infrastructure/queue/queue.constants';
import { ProcessWebhookJob } from '../../../../shared/infrastructure/queue/job-payloads';
import { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import { WEBHOOK_EVENT_REPOSITORY, WebhookEventRepository } from '../../domain/repositories/webhook-event.repository';
import { SignatureVerifier } from '../../domain/services/signature-verifier';
import { InvalidWebhookSignatureError } from '../../domain/errors/payments.errors';

// Minimal synchronous work — verify signature, persist raw, enqueue — then
// return fast. Ledger/order work happens in the process-webhook job
// (.docs/09-payments-ledger.md §2).
@Injectable()
export class WebhookIngestionService {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY) private readonly webhookEvents: WebhookEventRepository,
    private readonly signatureVerifier: SignatureVerifier,
    private readonly config: AppConfigService,
    @InjectQueue(QUEUE_NAMES.PAYMENT) private readonly paymentQueue: Queue,
  ) {}

  async ingest(payload: Record<string, unknown>): Promise<Result<{ webhookEventId: string }, InvalidWebhookSignatureError>> {
    const orderId = this.asString(payload.order_id);
    const statusCode = this.asString(payload.status_code);
    const grossAmount = this.asString(payload.gross_amount);
    const signatureKey = this.asString(payload.signature_key);

    const valid = this.signatureVerifier.verify({
      orderId,
      statusCode,
      grossAmount,
      serverKey: this.config.midtransServerKey,
      signatureKey,
    });
    if (!valid) {
      return Result.err(new InvalidWebhookSignatureError());
    }

    const event = WebhookEvent.fromRawPayload('midtrans', payload);
    await this.webhookEvents.save(event);

    await this.paymentQueue.add(JOB_NAMES.PROCESS_WEBHOOK, { webhookEventId: event.id } satisfies ProcessWebhookJob, {
      jobId: `webhook-${event.id}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
    });

    return Result.ok({ webhookEventId: event.id });
  }

  private asString(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
  }
}
