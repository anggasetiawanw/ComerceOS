import { ValueObject } from '../../../../shared/kernel/value-object.base';

export type StatusActorTypeValue = 'system' | 'seller' | 'buyer' | 'admin';

interface StatusChangeActorProps {
  type: StatusActorTypeValue;
  id: string | null;
}

export class StatusChangeActor extends ValueObject<StatusChangeActorProps> {
  private constructor(props: StatusChangeActorProps) {
    super(props);
  }

  static system(): StatusChangeActor {
    return new StatusChangeActor({ type: 'system', id: null });
  }

  static seller(userId: string): StatusChangeActor {
    return new StatusChangeActor({ type: 'seller', id: userId });
  }

  static buyer(userId: string): StatusChangeActor {
    return new StatusChangeActor({ type: 'buyer', id: userId });
  }

  static admin(userId: string): StatusChangeActor {
    return new StatusChangeActor({ type: 'admin', id: userId });
  }

  // For reconstruction from a persisted row, where the type/id pairing is
  // already known-valid — mirrors OrderStatus.of().
  static of(type: StatusActorTypeValue, id: string | null): StatusChangeActor {
    return new StatusChangeActor({ type, id });
  }

  get type(): StatusActorTypeValue {
    return this.props.type;
  }

  get id(): string | null {
    return this.props.id;
  }
}
