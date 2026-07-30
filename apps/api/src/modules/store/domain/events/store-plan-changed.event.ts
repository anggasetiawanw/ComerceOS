import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { StorePlanValue } from '../value-objects/store-plan.vo';
import { STORE_EVENT_NAMES } from './store-event-names';

export class StorePlanChangedEvent extends DomainEvent {
  constructor(
    readonly storeId: string,
    readonly username: string,
    readonly plan: StorePlanValue,
  ) {
    super();
  }

  get eventName(): string {
    return STORE_EVENT_NAMES.PLAN_CHANGED;
  }
}
