import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';

export class PlatformFeeError extends Error {}

interface PlatformFeeProps {
  rateBasisPoints: number;
  amount: Money;
}

const MAX_BASIS_POINTS = 10_000;

// platform_fee_rate persists as Decimal(5,4) — a rate, not money (.docs/06 §2.13).
// Basis points are the in-memory representation so no float arithmetic ever
// touches the rate; the decimal string is only produced at the persistence boundary.
export class PlatformFee extends ValueObject<PlatformFeeProps> {
  private constructor(props: PlatformFeeProps) {
    super(props);
  }

  static create(rateBasisPoints: number, amount: Money): Result<PlatformFee, PlatformFeeError> {
    if (!Number.isInteger(rateBasisPoints) || rateBasisPoints < 0 || rateBasisPoints > MAX_BASIS_POINTS) {
      return Result.err(new PlatformFeeError(`Fee rate must be between 0 and ${MAX_BASIS_POINTS} basis points`));
    }
    return Result.ok(new PlatformFee({ rateBasisPoints, amount }));
  }

  static fromRateDecimalString(decimal: string, amount: Money): Result<PlatformFee, PlatformFeeError> {
    const parsed = Number(decimal);
    if (!Number.isFinite(parsed)) {
      return Result.err(new PlatformFeeError(`Invalid fee rate decimal: "${decimal}"`));
    }
    return PlatformFee.create(Math.round(parsed * MAX_BASIS_POINTS), amount);
  }

  get rateBasisPoints(): number {
    return this.props.rateBasisPoints;
  }

  get amount(): Money {
    return this.props.amount;
  }

  toRateDecimalString(): string {
    return (this.props.rateBasisPoints / MAX_BASIS_POINTS).toFixed(4);
  }
}
