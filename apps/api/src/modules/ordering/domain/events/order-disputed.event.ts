import { OutboxDomainEvent } from '../../../../shared/kernel/outbox-domain-event.base';
import { ORDERING_EVENT_NAMES } from './ordering-event-names';

export class OrderDisputedEvent extends OutboxDomainEvent {
  constructor(
    readonly orderId: string,
    readonly storeId: string,
    readonly orderNumber: string,
    readonly reason: string | null,
  ) {
    super();
  }

  get eventName(): string {
    return ORDERING_EVENT_NAMES.ORDER_DISPUTED;
  }

  get aggregateType(): string {
    return 'order';
  }

  get aggregateId(): string {
    return this.orderId;
  }

  toPayload(): Record<string, unknown> {
    return { orderId: this.orderId, storeId: this.storeId, orderNumber: this.orderNumber, reason: this.reason };
  }
}
