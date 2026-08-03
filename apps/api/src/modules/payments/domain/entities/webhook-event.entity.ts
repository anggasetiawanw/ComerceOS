import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export type WebhookEventStatusValue = 'received' | 'processed' | 'failed' | 'ignored';

export interface WebhookEventProps {
  source: string;
  eventType: string | null;
  payload: Record<string, unknown>;
  orderId: string | null;
  transactionId: string | null;
  transactionStatus: string | null;
  status: WebhookEventStatusValue;
  errorMessage: string | null;
  receivedAt: Date;
  processedAt: Date | null;
}

// Persisted before any interpretation — a malformed payload is still
// evidence that Midtrans told us something (.docs/09-payments-ledger.md §2).
export class WebhookEvent extends Entity<WebhookEventProps> {
  private constructor(props: WebhookEventProps, id?: UniqueId) {
    super(props, id);
  }

  static fromRawPayload(source: string, payload: Record<string, unknown>): WebhookEvent {
    const transactionId = typeof payload.transaction_id === 'string' ? payload.transaction_id : null;
    const transactionStatus = typeof payload.transaction_status === 'string' ? payload.transaction_status : null;

    return new WebhookEvent({
      source,
      eventType: transactionStatus,
      payload,
      orderId: null,
      transactionId,
      transactionStatus,
      status: 'received',
      errorMessage: null,
      receivedAt: new Date(),
      processedAt: null,
    });
  }

  static reconstitute(props: WebhookEventProps, id: UniqueId): WebhookEvent {
    return new WebhookEvent(props, id);
  }

  get source(): string {
    return this.props.source;
  }

  get eventType(): string | null {
    return this.props.eventType;
  }

  get payload(): Record<string, unknown> {
    return this.props.payload;
  }

  get orderId(): string | null {
    return this.props.orderId;
  }

  get transactionId(): string | null {
    return this.props.transactionId;
  }

  get transactionStatus(): string | null {
    return this.props.transactionStatus;
  }

  get status(): WebhookEventStatusValue {
    return this.props.status;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get receivedAt(): Date {
    return this.props.receivedAt;
  }

  get processedAt(): Date | null {
    return this.props.processedAt;
  }

  linkOrder(orderId: string): void {
    this.props.orderId = orderId;
  }

  markProcessed(): void {
    this.props.status = 'processed';
    this.props.processedAt = new Date();
  }

  markIgnored(note?: string): void {
    this.props.status = 'ignored';
    this.props.errorMessage = note ?? this.props.errorMessage;
    this.props.processedAt = new Date();
  }

  markFailed(error: string): void {
    this.props.status = 'failed';
    this.props.errorMessage = error;
    this.props.processedAt = new Date();
  }
}
