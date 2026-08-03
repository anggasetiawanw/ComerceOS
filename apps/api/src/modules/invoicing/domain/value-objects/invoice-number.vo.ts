import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class InvoiceNumberError extends Error {}

interface InvoiceNumberProps {
  value: string;
}

const FORMAT = /^INV-\d{5,}$/;

// Format decision, recorded as drift (no doc specifies one): INV-{NNNNN},
// zero-padded to 5 digits, growing naturally past 5. Unique per store
// (@@unique([storeId, invoiceNumber]) in the schema), not globally — see
// migration 008's header comment. Deliberately doesn't embed the store
// username (mutable) or a UUID slice (collision-prone on a unique index).
export class InvoiceNumber extends ValueObject<InvoiceNumberProps> {
  private constructor(props: InvoiceNumberProps) {
    super(props);
  }

  static fromCounter(counter: number): InvoiceNumber {
    return new InvoiceNumber({ value: `INV-${String(counter).padStart(5, '0')}` });
  }

  static create(value: string): Result<InvoiceNumber, InvoiceNumberError> {
    if (!FORMAT.test(value)) {
      return Result.err(new InvoiceNumberError(`Invalid invoice number: "${value}"`));
    }
    return Result.ok(new InvoiceNumber({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
