import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { LEDGER_EVENT_NAMES } from './ledger-event-names';

// Plain DomainEvent, not OutboxDomainEvent: nothing consumes this outside
// the current process this sprint, and OutboxService.enqueueAll filters on
// `instanceof OutboxDomainEvent`, so publishing it in-process costs nothing
// and adds no outbox noise.
export class BalanceCreditedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly orderId: string,
    readonly amount: string,
  ) {
    super();
  }

  get eventName(): string {
    return LEDGER_EVENT_NAMES.BALANCE_CREDITED;
  }
}
