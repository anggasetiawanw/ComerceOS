import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { CATALOG_EVENT_NAMES } from './catalog-event-names';

export class DigitalFileAttachedEvent extends DomainEvent {
  constructor(
    readonly productId: string,
    readonly storeId: string,
    readonly digitalFileId: string,
  ) {
    super();
  }

  get eventName(): string {
    return CATALOG_EVENT_NAMES.DIGITAL_FILE_ATTACHED;
  }
}
