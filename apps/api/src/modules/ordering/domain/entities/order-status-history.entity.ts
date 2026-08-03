import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { OrderStatusValue } from '../value-objects/order-status.vo';
import { StatusChangeActor } from '../value-objects/status-change-actor.vo';

export interface OrderStatusHistoryProps {
  fromStatus: OrderStatusValue | null;
  toStatus: OrderStatusValue;
  actor: StatusChangeActor;
  reason: string | null;
  createdAt: Date;
}

// Append-only — every state transition writes exactly one of these
// (.docs/08-order-state-machine.md §6). Never updated, never deleted.
export class OrderStatusHistory extends Entity<OrderStatusHistoryProps> {
  private constructor(props: OrderStatusHistoryProps, id?: UniqueId) {
    super(props, id);
  }

  static record(params: {
    fromStatus: OrderStatusValue | null;
    toStatus: OrderStatusValue;
    actor: StatusChangeActor;
    reason?: string | null;
  }): OrderStatusHistory {
    return new OrderStatusHistory({
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      actor: params.actor,
      reason: params.reason ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: OrderStatusHistoryProps, id: UniqueId): OrderStatusHistory {
    return new OrderStatusHistory(props, id);
  }

  get fromStatus(): OrderStatusValue | null {
    return this.props.fromStatus;
  }

  get toStatus(): OrderStatusValue {
    return this.props.toStatus;
  }

  get actor(): StatusChangeActor {
    return this.props.actor;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
