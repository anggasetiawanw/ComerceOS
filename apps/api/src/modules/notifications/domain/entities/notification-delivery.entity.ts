import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export type NotificationChannelTypeValue = 'email' | 'whatsapp';
export type NotificationDeliveryStatusValue = 'pending' | 'sent' | 'failed' | 'skipped';

export interface NotificationDeliveryProps {
  channel: NotificationChannelTypeValue;
  provider: string;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationDeliveryStatusValue;
  attempts: number;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

// Row-first dispatch: this row is written BEFORE anything is sent, so a
// crash between "decided to send" and "actually sent" still leaves a
// record (.docs/10-background-jobs.md §3, .docs/03-bounded-contexts.md
// §3.12).
export class NotificationDelivery extends Entity<NotificationDeliveryProps> {
  private constructor(props: NotificationDeliveryProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: {
    channel: NotificationChannelTypeValue;
    provider: string;
    recipient: string;
    template: string;
    payload: Record<string, unknown>;
  }): NotificationDelivery {
    return new NotificationDelivery({
      channel: params.channel,
      provider: params.provider,
      recipient: params.recipient,
      template: params.template,
      payload: params.payload,
      status: 'pending',
      attempts: 0,
      errorMessage: null,
      sentAt: null,
      createdAt: new Date(),
    });
  }

  static skipped(params: {
    channel: NotificationChannelTypeValue;
    provider: string;
    recipient: string;
    template: string;
    payload: Record<string, unknown>;
    reason: string;
  }): NotificationDelivery {
    return new NotificationDelivery({
      channel: params.channel,
      provider: params.provider,
      recipient: params.recipient,
      template: params.template,
      payload: params.payload,
      status: 'skipped',
      attempts: 0,
      errorMessage: params.reason,
      sentAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: NotificationDeliveryProps, id: UniqueId): NotificationDelivery {
    return new NotificationDelivery(props, id);
  }

  get channel(): NotificationChannelTypeValue {
    return this.props.channel;
  }

  get provider(): string {
    return this.props.provider;
  }

  get recipient(): string {
    return this.props.recipient;
  }

  get template(): string {
    return this.props.template;
  }

  get payload(): Record<string, unknown> {
    return this.props.payload;
  }

  get status(): NotificationDeliveryStatusValue {
    return this.props.status;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  markSent(): void {
    this.props.status = 'sent';
    this.props.sentAt = new Date();
  }

  markFailed(error: string): void {
    this.props.status = 'failed';
    this.props.attempts += 1;
    this.props.errorMessage = error;
  }
}
