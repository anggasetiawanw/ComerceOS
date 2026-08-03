import { Result } from '../result';
import { ValueObject } from '../value-object.base';

export class MoneyError extends Error {}

interface MoneyProps {
  amount: bigint;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static zero(): Money {
    return new Money({ amount: 0n });
  }

  static fromRupiah(amount: bigint | number): Result<Money, MoneyError> {
    if (typeof amount === 'number') {
      if (!Number.isInteger(amount)) {
        return Result.err(new MoneyError(`Rupiah amount must be an integer, got ${amount}`));
      }
      return Money.fromRupiah(BigInt(amount));
    }
    if (amount < 0n) {
      return Result.err(new MoneyError('Rupiah amount cannot be negative'));
    }
    return Result.ok(new Money({ amount }));
  }

  static fromString(value: string): Result<Money, MoneyError> {
    if (!/^\d+$/.test(value)) {
      return Result.err(new MoneyError(`Invalid money string: "${value}"`));
    }
    return Money.fromRupiah(BigInt(value));
  }

  get amount(): bigint {
    return this.props.amount;
  }

  add(other: Money): Money {
    return new Money({ amount: this.props.amount + other.props.amount });
  }

  subtract(other: Money): Result<Money, MoneyError> {
    const remainder = this.props.amount - other.props.amount;
    if (remainder < 0n) {
      return Result.err(new MoneyError('Subtraction would produce a negative amount'));
    }
    return Result.ok(new Money({ amount: remainder }));
  }

  isZero(): boolean {
    return this.props.amount === 0n;
  }

  isGreaterThan(other: Money): boolean {
    return this.props.amount > other.props.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.props.amount >= other.props.amount;
  }

  isLessThan(other: Money): boolean {
    return this.props.amount < other.props.amount;
  }

  multiply(factor: number): Result<Money, MoneyError> {
    if (!Number.isInteger(factor) || factor < 0) {
      return Result.err(new MoneyError(`Multiplier must be a non-negative integer, got ${factor}`));
    }
    return Money.fromRupiah(this.props.amount * BigInt(factor));
  }

  min(other: Money): Money {
    return this.props.amount <= other.props.amount ? this : other;
  }

  percentageBasisPoints(bps: number): Result<Money, MoneyError> {
    if (!Number.isInteger(bps) || bps < 0) {
      return Result.err(new MoneyError(`Basis points must be a non-negative integer, got ${bps}`));
    }
    const numerator = this.props.amount * BigInt(bps) + 5000n;
    return Money.fromRupiah(numerator / 10000n);
  }

  toString(): string {
    return this.props.amount.toString();
  }

  toJSON(): string {
    return this.toString();
  }

  [Symbol.toPrimitive](): never {
    throw new MoneyError('Money must not be implicitly coerced — call .toString() or read .amount');
  }
}
