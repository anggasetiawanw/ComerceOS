import { randomBytes } from 'node:crypto';
import { format } from 'date-fns';
import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class OrderNumberError extends Error {}

interface OrderNumberProps {
  value: string;
}

// Globally unique, not per-store: Midtrans requires order_id uniqueness per
// merchant account (all stores share one Midtrans account, AD-... Model 1
// merchant-of-record), and shows this value in their dashboard, so it needs
// to read as a single coherent series rather than colliding across stores.
const NO_AMBIGUOUS_CHARS_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 6;
const PATTERN = /^ORD-\d{6}-[A-Z0-9]{6}$/;

export class OrderNumber extends ValueObject<OrderNumberProps> {
  private constructor(props: OrderNumberProps) {
    super(props);
  }

  static create(value: string): Result<OrderNumber, OrderNumberError> {
    if (!PATTERN.test(value)) {
      return Result.err(new OrderNumberError(`Invalid order number: "${value}"`));
    }
    return Result.ok(new OrderNumber({ value }));
  }

  static generate(now: Date = new Date()): OrderNumber {
    const datePart = format(now, 'yyMMdd');
    const bytes = randomBytes(SUFFIX_LENGTH);
    const suffix = Array.from(bytes, (byte) => NO_AMBIGUOUS_CHARS_ALPHABET[byte % NO_AMBIGUOUS_CHARS_ALPHABET.length]).join('');
    return new OrderNumber({ value: `ORD-${datePart}-${suffix}` });
  }

  get value(): string {
    return this.props.value;
  }
}
