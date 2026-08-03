import { OutboxDomainEvent } from '../../../../shared/kernel/outbox-domain-event.base';
import { ORDERING_EVENT_NAMES } from './ordering-event-names';

export class OrderCreatedEvent extends OutboxDomainEvent {
  constructor(
    readonly orderId: string,
    readonly storeId: string,
    readonly buyerId: string,
    readonly orderNumber: string,
  ) {
    super();
  }

  get eventName(): string {
    return ORDERING_EVENT_NAMES.ORDER_CREATED;
  }

  get aggregateType(): string {
    return 'order';
  }

  get aggregateId(): string {
    return this.orderId;
  }

  toPayload(): Record<string, unknown> {
    return { orderId: this.orderId, storeId: this.storeId, buyerId: this.buyerId, orderNumber: this.orderNumber };
  }
}
