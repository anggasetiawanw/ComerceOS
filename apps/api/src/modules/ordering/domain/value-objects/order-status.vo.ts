import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class OrderStatusError extends Error {}

export type OrderStatusValue =
  | 'pending_payment'
  | 'paid'
  | 'holding'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled'
  | 'expired';

interface OrderStatusProps {
  value: OrderStatusValue;
}

const VALID_STATUSES: readonly OrderStatusValue[] = [
  'pending_payment',
  'paid',
  'holding',
  'released',
  'disputed',
  'refunded',
  'cancelled',
  'expired',
];

// refunded/cancelled/expired are terminal. released is not strictly terminal
// — a late dispute can still move it to disputed (.docs/08-order-state-machine.md §2).
const TERMINAL_STATUSES: readonly OrderStatusValue[] = ['refunded', 'cancelled', 'expired'];

export class OrderStatus extends ValueObject<OrderStatusProps> {
  private constructor(props: OrderStatusProps) {
    super(props);
  }

  static create(value: string): Result<OrderStatus, OrderStatusError> {
    const match = VALID_STATUSES.find((status) => status === value);
    if (!match) {
      return Result.err(new OrderStatusError(`Invalid order status: "${value}"`));
    }
    return Result.ok(new OrderStatus({ value: match }));
  }

  static pendingPayment(): OrderStatus {
    return new OrderStatus({ value: 'pending_payment' });
  }

  // Skips validation for callers that already hold a type-safe OrderStatusValue
  // (internal aggregate transitions, where the literal is guaranteed valid by
  // the type system) — mirrors StorePlan.free()/SettlementMode.auto().
  static of(value: OrderStatusValue): OrderStatus {
    return new OrderStatus({ value });
  }

  get value(): OrderStatusValue {
    return this.props.value;
  }

  isTerminal(): boolean {
    return TERMINAL_STATUSES.includes(this.props.value);
  }
}
