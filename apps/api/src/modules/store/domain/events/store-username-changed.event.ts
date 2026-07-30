import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { STORE_EVENT_NAMES } from './store-event-names';

export class StoreUsernameChangedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly previousUsername: string,
    readonly newUsername: string,
  ) {
    super();
  }

  get eventName(): string {
    return STORE_EVENT_NAMES.USERNAME_CHANGED;
  }
}
