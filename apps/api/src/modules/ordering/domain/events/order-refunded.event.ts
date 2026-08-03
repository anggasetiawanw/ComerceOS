import { OutboxDomainEvent } from '../../../../shared/kernel/outbox-domain-event.base';
import { ORDERING_EVENT_NAMES } from './ordering-event-names';

export class OrderRefundedEvent extends OutboxDomainEvent {
  constructor(
    readonly orderId: string,
    readonly storeId: string,
    readonly orderNumber: string,
    readonly requiresManualRecovery: boolean,
  ) {
    super();
  }

  get eventName(): string {
    return ORDERING_EVENT_NAMES.ORDER_REFUNDED;
  }

  get aggregateType(): string {
    return 'order';
  }

  get aggregateId(): string {
    return this.orderId;
  }

  toPayload(): Record<string, unknown> {
    return {
      orderId: this.orderId,
      storeId: this.storeId,
      orderNumber: this.orderNumber,
      requiresManualRecovery: this.requiresManualRecovery,
    };
  }
}
