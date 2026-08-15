import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class InquiryStatusError extends Error {}

export type InquiryStatusValue = 'open' | 'converted' | 'lost';

interface InquiryStatusProps {
  value: InquiryStatusValue;
}

const VALID_STATUSES: readonly InquiryStatusValue[] = ['open', 'converted', 'lost'];

export class InquiryStatus extends ValueObject<InquiryStatusProps> {
  private constructor(props: InquiryStatusProps) {
    super(props);
  }

  static create(value: string): Result<InquiryStatus, InquiryStatusError> {
    const match = VALID_STATUSES.find((status) => status === value);
    if (!match) {
      return Result.err(new InquiryStatusError(`Invalid inquiry status: "${value}"`));
    }
    return Result.ok(new InquiryStatus({ value: match }));
  }

  static open(): InquiryStatus {
    return new InquiryStatus({ value: 'open' });
  }

  get value(): InquiryStatusValue {
    return this.props.value;
  }

  isOpen(): boolean {
    return this.props.value === 'open';
  }
}
