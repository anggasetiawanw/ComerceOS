import * as argon2 from 'argon2';
import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class PasswordHashError extends Error {}

interface PasswordHashProps {
  hash: string;
}

const MIN_PASSWORD_LENGTH = 8;

export class PasswordHash extends ValueObject<PasswordHashProps> {
  private constructor(props: PasswordHashProps) {
    super(props);
  }

  static async fromPlainText(plain: string): Promise<Result<PasswordHash, PasswordHashError>> {
    if (plain.length < MIN_PASSWORD_LENGTH) {
      return Result.err(
        new PasswordHashError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
      );
    }
    const hash = await argon2.hash(plain, { type: argon2.argon2id });
    return Result.ok(new PasswordHash({ hash }));
  }

  static fromHash(hash: string): PasswordHash {
    return new PasswordHash({ hash });
  }

  get hash(): string {
    return this.props.hash;
  }

  verify(plain: string): Promise<boolean> {
    return argon2.verify(this.props.hash, plain);
  }
}
