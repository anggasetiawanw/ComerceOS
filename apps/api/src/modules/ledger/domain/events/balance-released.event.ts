import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { LEDGER_EVENT_NAMES } from './ledger-event-names';

export class BalanceReleasedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly orderId: string,
    readonly amount: string,
  ) {
    super();
  }

  get eventName(): string {
    return LEDGER_EVENT_NAMES.BALANCE_RELEASED;
  }
}
