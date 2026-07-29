import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export class UserRegisteredWithPasswordEvent extends DomainEvent {
  constructor(
    readonly userId: UniqueId,
    readonly email: string,
  ) {
    super();
  }

  get eventName(): string {
    return 'identity.user_registered_with_password';
  }
}
