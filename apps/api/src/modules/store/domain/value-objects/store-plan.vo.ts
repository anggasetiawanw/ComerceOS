import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class StorePlanError extends Error {}

export type StorePlanValue = 'free' | 'pro';

interface StorePlanProps {
  value: StorePlanValue;
}

const VALID_PLANS: readonly StorePlanValue[] = ['free', 'pro'];

export class StorePlan extends ValueObject<StorePlanProps> {
  private constructor(props: StorePlanProps) {
    super(props);
  }

  static create(value: string): Result<StorePlan, StorePlanError> {
    const match = VALID_PLANS.find((plan) => plan === value);
    if (!match) {
      return Result.err(new StorePlanError(`Invalid plan: "${value}"`));
    }
    return Result.ok(new StorePlan({ value: match }));
  }

  static free(): StorePlan {
    return new StorePlan({ value: 'free' });
  }

  get value(): StorePlanValue {
    return this.props.value;
  }

  isPro(): boolean {
    return this.props.value === 'pro';
  }

  feeRateBasisPoints(rates: { free: number; pro: number }): number {
    const rate = this.isPro() ? rates.pro : rates.free;
    return Math.round(rate * 10_000);
  }
}
