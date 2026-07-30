import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { STORE_EVENT_NAMES } from './store-event-names';

export class StoreSocialLinksChangedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly username: string,
  ) {
    super();
  }

  get eventName(): string {
    return STORE_EVENT_NAMES.SOCIAL_LINKS_CHANGED;
  }
}
