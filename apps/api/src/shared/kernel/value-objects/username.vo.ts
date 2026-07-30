import { Result } from '../result';
import { ValueObject } from '../value-object.base';
import { RESERVED_USERNAMES } from './reserved-usernames';

export type UsernameRejectionReason = 'format' | 'reserved';

export class UsernameError extends Error {
  constructor(
    message: string,
    readonly reason: UsernameRejectionReason,
  ) {
    super(message);
  }
}

interface UsernameProps {
  value: string;
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_.]*[a-z0-9])?$/;

export class Username extends ValueObject<UsernameProps> {
  private constructor(props: UsernameProps) {
    super(props);
  }

  static create(value: string): Result<Username, UsernameError> {
    const normalized = value.trim().toLowerCase();

    if (
      normalized.length < USERNAME_MIN_LENGTH ||
      normalized.length > USERNAME_MAX_LENGTH ||
      !USERNAME_PATTERN.test(normalized)
    ) {
      return Result.err(new UsernameError(`Invalid username format: "${value}"`, 'format'));
    }

    if (RESERVED_USERNAMES.has(normalized)) {
      return Result.err(new UsernameError(`Username "${normalized}" is reserved`, 'reserved'));
    }

    return Result.ok(new Username({ value: normalized }));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }

  toJSON(): string {
    return this.props.value;
  }
}
