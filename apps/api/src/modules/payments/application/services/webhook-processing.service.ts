import { Inject, Injectable, Logger } from '@nestjs/common';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { ORDER_REPOSITORY, OrderRepository } from '../../../ordering/domain/repositories/order.repository';
import { StatusChangeActor } from '../../../ordering/domain/value-objects/status-change-actor.vo';
import { MarkOrderPaidService } from '../../../ordering/application/services/mark-order-paid.service';
import { CancelOrderService } from '../../../ordering/application/services/cancel-order.service';
import { WEBHOOK_EVENT_REPOSITORY, WebhookEventRepository } from '../../domain/repositories/webhook-event.repository';
import { PaymentStatusMapper } from '../../domain/services/payment-status.mapper';

// The ingestion/processing split is deliberate: ingestion (HTTP, fast) only
// verifies + persists + enqueues; this runs as the process-webhook job and
// does the actual dedup + order transition (.docs/04-entity-design.md §5).
// Payments -> Ordering is a direct in-process call here, not a second
// outbox hop — the sequence diagram in .docs/09-payments-ledger.md §2 shows
// PaymentSettled -> MarkOrderPaid happening inside this same job.
@Injectable()
export class WebhookProcessingService {
  private readonly logger = new Logger(WebhookProcessingService.name);

  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY) private readonly webhookEvents: WebhookEventRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly statusMapper: PaymentStatusMapper,
    private readonly markOrderPaid: MarkOrderPaidService,
    private readonly cancelOrder: CancelOrderService,
  ) {}

  async process(webhookEventId: string): Promise<void> {
    const event = await this.webhookEvents.findById(webhookEventId);
    if (!event) {
      this.logger.warn(`Webhook event ${webhookEventId} not found`);
      return;
    }
    if (event.status !== 'received') {
      return;
    }

    const alreadyProcessed = await this.webhookEvents.existsProcessed(
      event.source,
      event.transactionId,
      event.transactionStatus,
    );
    if (alreadyProcessed) {
      event.markIgnored('Duplicate delivery of an already-processed transaction + status');
      await this.webhookEvents.save(event);
      return;
    }

    const payload = event.payload;
    const orderNumber = this.asString(payload.order_id);
    const order = await this.orders.findByOrderNumber(orderNumber);
    if (!order) {
      event.markFailed(`No order found for order_number "${orderNumber}"`);
      await this.webhookEvents.save(event);
      return;
    }
    event.linkOrder(order.id);

    const transactionStatus = this.asString(payload.transaction_status);
    const fraudStatus = typeof payload.fraud_status === 'string' ? payload.fraud_status : null;
    const mapped = this.statusMapper.map(transactionStatus, fraudStatus);

    switch (mapped) {
      case 'settled': {
        const grossAmountResult = Money.fromString(this.normalizeAmount(payload.gross_amount));
        if (grossAmountResult.isErr() || !grossAmountResult.unwrap().equals(order.total)) {
          event.markFailed(
            `Amount mismatch: webhook reported ${this.normalizeAmount(payload.gross_amount)}, order total is ${order.total.toString()}`,
          );
          break;
        }

        const result = await this.markOrderPaid.execute(order.id, {
          method: typeof payload.payment_type === 'string' ? payload.payment_type : 'unknown',
          transactionId: event.transactionId,
        });
        if (result.isErr()) {
          event.markIgnored(`Order already advanced past pending_payment: ${result.unwrapErr().message}`);
        } else {
          event.markProcessed();
        }
        break;
      }
      case 'pending':
        event.markProcessed();
        break;
      case 'failed': {
        const result = await this.cancelOrder.execute(order.id, StatusChangeActor.system(), 'Payment failed at Midtrans');
        if (result.isErr()) {
          event.markIgnored(result.unwrapErr().message);
        } else {
          event.markProcessed();
        }
        break;
      }
      case 'expired':
        // The expire-orders job already handles the time-based path; a late
        // PaymentExpired webhook for an order already expired is a no-op.
        event.markProcessed();
        break;
      case 'refund_completed':
        // Refund flow is Sprint 11 — recorded, not yet actioned.
        event.markProcessed();
        break;
      default:
        event.markFailed(`Unrecognized transaction_status "${transactionStatus}"`);
    }

    await this.webhookEvents.save(event);
  }

  private asString(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
  }

  private normalizeAmount(value: unknown): string {
    const str = this.asString(value);
    const dotIndex = str.indexOf('.');
    return dotIndex === -1 ? str : str.slice(0, dotIndex);
  }
}
