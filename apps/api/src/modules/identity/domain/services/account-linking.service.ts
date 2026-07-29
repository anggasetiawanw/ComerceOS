import { Result } from '../../../../shared/kernel/result';
import { User } from '../entities/user.aggregate';
import { PasswordHash } from '../value-objects/password-hash.vo';
import { AccountLinkingViolationError } from '../errors/identity.errors';

export class AccountLinkingService {
  linkGoogleAccount(user: User, googleId: string): Result<void, AccountLinkingViolationError> {
    return user.linkGoogleAccount(googleId);
  }

  unlinkGoogleAccount(user: User): Result<void, AccountLinkingViolationError> {
    return user.unlinkGoogleAccount();
  }

  setPassword(user: User, passwordHash: PasswordHash): Result<void, AccountLinkingViolationError> {
    return user.setPasswordHash(passwordHash);
  }
}
