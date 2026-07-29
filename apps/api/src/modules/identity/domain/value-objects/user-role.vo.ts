import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class UserRoleError extends Error {}

export type UserRoleValue = 'buyer' | 'seller' | 'admin';

interface UserRoleProps {
  value: UserRoleValue;
}

const VALID_ROLES: UserRoleValue[] = ['buyer', 'seller', 'admin'];

export class UserRole extends ValueObject<UserRoleProps> {
  private constructor(props: UserRoleProps) {
    super(props);
  }

  static create(value: string): Result<UserRole, UserRoleError> {
    if (!VALID_ROLES.includes(value as UserRoleValue)) {
      return Result.err(new UserRoleError(`Invalid role: "${value}"`));
    }
    return Result.ok(new UserRole({ value: value as UserRoleValue }));
  }

  static buyer(): UserRole {
    return new UserRole({ value: 'buyer' });
  }

  get value(): UserRoleValue {
    return this.props.value;
  }

  isAdmin(): boolean {
    return this.props.value === 'admin';
  }

  isSeller(): boolean {
    return this.props.value === 'seller';
  }
}
