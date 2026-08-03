import { ValueObject } from '../../../../shared/kernel/value-object.base';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';

interface DiscountApplicationProps {
  code: string | null;
  amount: Money;
}

export class DiscountApplication extends ValueObject<DiscountApplicationProps> {
  private constructor(props: DiscountApplicationProps) {
    super(props);
  }

  static none(): DiscountApplication {
    return new DiscountApplication({ code: null, amount: Money.zero() });
  }

  static of(code: string, amount: Money): DiscountApplication {
    return new DiscountApplication({ code, amount });
  }

  get code(): string | null {
    return this.props.code;
  }

  get amount(): Money {
    return this.props.amount;
  }
}
