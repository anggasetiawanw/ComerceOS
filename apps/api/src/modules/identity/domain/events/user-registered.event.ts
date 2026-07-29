import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    readonly userId: UniqueId,
    readonly email: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'identity.user_registered';
  }
}
