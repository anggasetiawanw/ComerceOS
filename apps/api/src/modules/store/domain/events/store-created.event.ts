import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { STORE_EVENT_NAMES } from './store-event-names';

export class StoreCreatedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly username: string,
    readonly ownerId: string,
  ) {
    super();
  }

  get eventName(): string {
    return STORE_EVENT_NAMES.CREATED;
  }
}
