import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { SettlementModeValue } from '../value-objects/settlement-mode.vo';
import { STORE_EVENT_NAMES } from './store-event-names';

export class SettlementModeChangedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly mode: SettlementModeValue,
  ) {
    super();
  }

  get eventName(): string {
    return STORE_EVENT_NAMES.SETTLEMENT_MODE_CHANGED;
  }
}
