import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class OrderSourceError extends Error {}

export type OrderSourceValue = 'self_checkout' | 'manual';

interface OrderSourceProps {
  value: OrderSourceValue;
}

const VALID_SOURCES: readonly OrderSourceValue[] = ['self_checkout', 'manual'];

export class OrderSource extends ValueObject<OrderSourceProps> {
  private constructor(props: OrderSourceProps) {
    super(props);
  }

  static create(value: string): Result<OrderSource, OrderSourceError> {
    const match = VALID_SOURCES.find((source) => source === value);
    if (!match) {
      return Result.err(new OrderSourceError(`Invalid order source: "${value}"`));
    }
    return Result.ok(new OrderSource({ value: match }));
  }

  static selfCheckout(): OrderSource {
    return new OrderSource({ value: 'self_checkout' });
  }

  static manual(): OrderSource {
    return new OrderSource({ value: 'manual' });
  }

  get value(): OrderSourceValue {
    return this.props.value;
  }
}
