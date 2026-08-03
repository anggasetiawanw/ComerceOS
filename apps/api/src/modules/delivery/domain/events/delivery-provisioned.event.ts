import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { DELIVERY_EVENT_NAMES } from './delivery-event-names';

export class DeliveryProvisionedEvent extends DomainEvent {
  constructor(
    readonly deliveryId: string,
    readonly orderItemId: string,
  ) {
    super();
  }

  get eventName(): string {
    return DELIVERY_EVENT_NAMES.DELIVERY_PROVISIONED;
  }
}
