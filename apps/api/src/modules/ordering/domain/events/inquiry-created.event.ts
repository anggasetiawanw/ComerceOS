import { OutboxDomainEvent } from '../../../../shared/kernel/outbox-domain-event.base';
import { ORDERING_EVENT_NAMES } from './ordering-event-names';

export class InquiryCreatedEvent extends OutboxDomainEvent {
  constructor(
    readonly inquiryId: string,
    readonly storeId: string,
    readonly productId: string | null,
    readonly buyerId: string | null,
  ) {
    super();
  }

  get eventName(): string {
    return ORDERING_EVENT_NAMES.INQUIRY_CREATED;
  }

  get aggregateType(): string {
    return 'inquiry';
  }

  get aggregateId(): string {
    return this.inquiryId;
  }

  toPayload(): Record<string, unknown> {
    return { inquiryId: this.inquiryId, storeId: this.storeId, productId: this.productId, buyerId: this.buyerId };
  }
}
