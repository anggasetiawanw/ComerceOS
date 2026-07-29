import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export class PasswordSetEvent extends DomainEvent {
  constructor(readonly userId: UniqueId) {
    super();
  }

  get eventName(): string {
    return 'identity.password_set';
  }
}
