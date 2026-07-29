import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { AccountLinkingService } from '../../domain/services/account-linking.service';
import { PasswordHash, PasswordHashError } from '../../domain/value-objects/password-hash.vo';
import { AccountLinkingViolationError } from '../../domain/errors/identity.errors';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';
import { GOOGLE_OAUTH_CLIENT, GoogleOAuthClient } from '../ports/google-oauth-client.port';

@Injectable()
export class AccountLinkingApplicationService {
  private readonly linking = new AccountLinkingService();

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(GOOGLE_OAUTH_CLIENT) private readonly googleClient: GoogleOAuthClient,
  ) {}

  async linkGoogleAccount(
    userId: UniqueId,
    googleIdToken: string,
  ): Promise<Result<void, AccountLinkingViolationError>> {
    const profile = await this.googleClient.verifyIdToken(googleIdToken);

    const existingOwner = await this.users.findByGoogleId(profile.googleId);
    if (existingOwner && existingOwner.id !== userId) {
      return Result.err(
        new AccountLinkingViolationError(
          'This Google account is already linked to a different user',
        ),
      );
    }

    const user = await this.users.findById(userId);
    if (!user) {
      return Result.err(new AccountLinkingViolationError('User not found'));
    }

    const result = this.linking.linkGoogleAccount(user, profile.googleId);
    if (result.isErr()) {
      return result;
    }

    await this.users.save(user);
    return Result.ok(undefined);
  }

  async unlinkGoogleAccount(userId: UniqueId): Promise<Result<void, AccountLinkingViolationError>> {
    const user = await this.users.findById(userId);
    if (!user) {
      return Result.err(new AccountLinkingViolationError('User not found'));
    }

    const result = this.linking.unlinkGoogleAccount(user);
    if (result.isErr()) {
      return result;
    }

    await this.users.save(user);
    return Result.ok(undefined);
  }

  async setPassword(
    userId: UniqueId,
    plainPassword: string,
  ): Promise<Result<void, AccountLinkingViolationError | PasswordHashError>> {
    const user = await this.users.findById(userId);
    if (!user) {
      return Result.err(new AccountLinkingViolationError('User not found'));
    }

    const passwordHashResult = await PasswordHash.fromPlainText(plainPassword);
    if (passwordHashResult.isErr()) {
      return Result.err(passwordHashResult.unwrapErr());
    }

    const result = this.linking.setPassword(user, passwordHashResult.unwrap());
    if (result.isErr()) {
      return result;
    }

    await this.users.save(user);
    return Result.ok(undefined);
  }
}
