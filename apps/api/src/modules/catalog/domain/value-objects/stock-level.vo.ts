import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class StockLevelError extends Error {}

interface StockLevelProps {
  value: number | null;
}

export class StockLevel extends ValueObject<StockLevelProps> {
  private constructor(props: StockLevelProps) {
    super(props);
  }

  static unlimited(): StockLevel {
    return new StockLevel({ value: null });
  }

  static of(value: number): Result<StockLevel, StockLevelError> {
    if (!Number.isInteger(value) || value < 0) {
      return Result.err(new StockLevelError(`Stock must be a non-negative integer, got ${value}`));
    }
    return Result.ok(new StockLevel({ value }));
  }

  static create(value: number | null): Result<StockLevel, StockLevelError> {
    return value === null ? Result.ok(StockLevel.unlimited()) : StockLevel.of(value);
  }

  get value(): number | null {
    return this.props.value;
  }

  isUnlimited(): boolean {
    return this.props.value === null;
  }

  isDepleted(): boolean {
    return this.props.value === 0;
  }

  decrement(quantity: number): Result<StockLevel, StockLevelError> {
    if (this.props.value === null) return Result.ok(this);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return Result.err(new StockLevelError(`Quantity must be a non-negative integer, got ${quantity}`));
    }
    const remainder = this.props.value - quantity;
    if (remainder < 0) {
      return Result.err(new StockLevelError('Stock cannot go negative'));
    }
    return StockLevel.of(remainder);
  }

  toJSON(): number | null {
    return this.props.value;
  }
}
