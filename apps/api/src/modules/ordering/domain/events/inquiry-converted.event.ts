import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { ORDERING_EVENT_NAMES } from './ordering-event-names';

// Not outbox-routed — the resulting order's own OrderCreatedEvent already
// carries the conversion forward for any consumer that cares. Kept as a
// plain DomainEvent for the in-process bus (e.g. future analytics) rather
// than the outbox, matching CancelOrderService-adjacent events that have no
// external consumer yet.
export class InquiryConvertedEvent extends DomainEvent {
  constructor(
    readonly inquiryId: string,
    readonly storeId: string,
    readonly orderId: string,
  ) {
    super();
  }

  get eventName(): string {
    return ORDERING_EVENT_NAMES.INQUIRY_CONVERTED;
  }
}
