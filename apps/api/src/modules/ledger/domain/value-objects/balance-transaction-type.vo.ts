import { ValueObject } from '../../../../shared/kernel/value-object.base';

export type BalanceDirection = 'none' | 'increase' | 'decrease';

export type BalanceTransactionTypeValue =
  | 'order_paid_holding'
  | 'order_released'
  | 'withdrawal_paid'
  | 'refund_debit'
  | 'promo_adjustment';

interface BalanceTransactionTypeProps {
  value: BalanceTransactionTypeValue;
  holding: BalanceDirection;
  available: BalanceDirection;
}

const directionOf = (delta: bigint): BalanceDirection => {
  if (delta > 0n) return 'increase';
  if (delta < 0n) return 'decrease';
  return 'none';
};

// Money (shared/kernel/value-objects/money.vo.ts) cannot be negative, so
// direction lives here rather than in a signed amount column. refund_debit
// has two effects depending on whether the order was already released —
// the type alone can't derive which, which is why the effect is captured
// per-instance rather than looked up from a fixed table
// (.docs/09-payments-ledger.md §4).
export class BalanceTransactionType extends ValueObject<BalanceTransactionTypeProps> {
  private constructor(props: BalanceTransactionTypeProps) {
    super(props);
  }

  static orderPaidHolding(): BalanceTransactionType {
    return new BalanceTransactionType({ value: 'order_paid_holding', holding: 'increase', available: 'none' });
  }

  // One entry, both movements — .docs/09 §4's worked example: "-95.000 / +95.000".
  static orderReleased(): BalanceTransactionType {
    return new BalanceTransactionType({ value: 'order_released', holding: 'decrease', available: 'increase' });
  }

  static withdrawalPaid(): BalanceTransactionType {
    return new BalanceTransactionType({ value: 'withdrawal_paid', holding: 'none', available: 'decrease' });
  }

  static refundDebitFromHolding(): BalanceTransactionType {
    return new BalanceTransactionType({ value: 'refund_debit', holding: 'decrease', available: 'none' });
  }

  static refundDebitFromAvailable(): BalanceTransactionType {
    return new BalanceTransactionType({ value: 'refund_debit', holding: 'none', available: 'decrease' });
  }

  static promoAdjustment(effect: { holding: BalanceDirection; available: BalanceDirection }): BalanceTransactionType {
    return new BalanceTransactionType({ value: 'promo_adjustment', holding: effect.holding, available: effect.available });
  }

  // The mapper's path back from a persisted row: the direction is derived
  // from the sign of the stored deltas rather than re-deriving it from
  // `value` alone, since refund_debit's effect depends on context that only
  // the deltas still capture.
  static reconstitute(value: BalanceTransactionTypeValue, holdingDelta: bigint, availableDelta: bigint): BalanceTransactionType {
    return new BalanceTransactionType({
      value,
      holding: directionOf(holdingDelta),
      available: directionOf(availableDelta),
    });
  }

  get value(): BalanceTransactionTypeValue {
    return this.props.value;
  }

  get holdingDirection(): BalanceDirection {
    return this.props.holding;
  }

  get availableDirection(): BalanceDirection {
    return this.props.available;
  }
}
