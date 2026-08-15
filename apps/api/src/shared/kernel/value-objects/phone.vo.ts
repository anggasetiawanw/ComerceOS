import { Result } from '../result';
import { ValueObject } from '../value-object.base';

export class PhoneError extends Error {}

interface PhoneProps {
  value: string;
}

// Indonesian mobile numbers only. Normalized and stored as 628xxxxxxxxxx
// (no leading '+', no leading '0') so every consumer — the wa.me deep link
// builder, notification recipients — reads one canonical shape rather than
// re-normalizing at each call site. Deferred from Sprint 2 to Sprint 9,
// which is the first caller that needs a real format check
// (.docs/12-roadmap-sprints.md Sprint 2 drift notes).
const DIGITS_ONLY = /^\d+$/;

export class Phone extends ValueObject<PhoneProps> {
  private constructor(props: PhoneProps) {
    super(props);
  }

  static create(raw: string): Result<Phone, PhoneError> {
    const trimmed = raw.trim().replace(/[\s-]/g, '');
    if (!DIGITS_ONLY.test(trimmed.replace(/^\+/, ''))) {
      return Result.err(new PhoneError(`Invalid phone number: "${raw}"`));
    }

    let normalized: string;
    if (trimmed.startsWith('+62')) {
      normalized = trimmed.slice(1);
    } else if (trimmed.startsWith('62')) {
      normalized = trimmed;
    } else if (trimmed.startsWith('0')) {
      normalized = `62${trimmed.slice(1)}`;
    } else {
      return Result.err(new PhoneError(`Phone number must start with 08, 62, or +62: "${raw}"`));
    }

    if (normalized.length < 10 || normalized.length > 15) {
      return Result.err(new PhoneError(`Phone number has an invalid length: "${raw}"`));
    }

    return Result.ok(new Phone({ value: normalized }));
  }

  get value(): string {
    return this.props.value;
  }

  // Local 08xx form, for display in a form field.
  toLocalFormat(): string {
    return `0${this.props.value.slice(2)}`;
  }

  toWhatsAppLink(prefilledMessage?: string): string {
    const base = `https://wa.me/${this.props.value}`;
    return prefilledMessage ? `${base}?text=${encodeURIComponent(prefilledMessage)}` : base;
  }

  toString(): string {
    return this.props.value;
  }

  toJSON(): string {
    return this.props.value;
  }
}
