import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { CATALOG_EVENT_NAMES } from './catalog-event-names';

export class ProductCreatedEvent extends DomainEvent {
  constructor(
    readonly productId: string,
    readonly storeId: string,
    readonly slug: string,
  ) {
    super();
  }

  get eventName(): string {
    return CATALOG_EVENT_NAMES.PRODUCT_CREATED;
  }
}
