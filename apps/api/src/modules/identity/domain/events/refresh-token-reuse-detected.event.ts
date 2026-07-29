import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export class RefreshTokenReuseDetectedEvent extends DomainEvent {
  constructor(
    readonly userId: UniqueId,
    readonly familyId: UniqueId,
  ) {
    super();
  }

  get eventName(): string {
    return 'identity.refresh_token_reuse_detected';
  }
}
