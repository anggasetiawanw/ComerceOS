import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class WithdrawalStatusError extends Error {}

export type WithdrawalStatusValue = 'requested' | 'approved' | 'paid' | 'rejected';

interface WithdrawalStatusProps {
  value: WithdrawalStatusValue;
}

const VALID_STATUSES: readonly WithdrawalStatusValue[] = ['requested', 'approved', 'paid', 'rejected'];
const TERMINAL_STATUSES: readonly WithdrawalStatusValue[] = ['paid', 'rejected'];

export class WithdrawalStatus extends ValueObject<WithdrawalStatusProps> {
  private constructor(props: WithdrawalStatusProps) {
    super(props);
  }

  static create(value: string): Result<WithdrawalStatus, WithdrawalStatusError> {
    const match = VALID_STATUSES.find((status) => status === value);
    if (!match) {
      return Result.err(new WithdrawalStatusError(`Invalid withdrawal status: "${value}"`));
    }
    return Result.ok(new WithdrawalStatus({ value: match }));
  }

  static requested(): WithdrawalStatus {
    return new WithdrawalStatus({ value: 'requested' });
  }

  static of(value: WithdrawalStatusValue): WithdrawalStatus {
    return new WithdrawalStatus({ value });
  }

  get value(): WithdrawalStatusValue {
    return this.props.value;
  }

  isTerminal(): boolean {
    return TERMINAL_STATUSES.includes(this.props.value);
  }
}
