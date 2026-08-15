import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { AppJwtService } from '../../../../shared/security/jwt.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { Email, EmailError } from '../../domain/value-objects/email.vo';
import { PasswordHash, PasswordHashError } from '../../domain/value-objects/password-hash.vo';
import { TokenFamily } from '../../domain/value-objects/token-family.vo';
import { User } from '../../domain/entities/user.aggregate';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { VerificationToken } from '../../domain/entities/verification-token.entity';
import { TokenRotationService } from '../../domain/services/token-rotation.service';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';
import {
  RefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository';
import {
  VerificationTokenRepository,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../domain/repositories/verification-token.repository';
import {
  AccountLinkingViolationError,
  EmailAlreadyRegisteredError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
} from '../../domain/errors/identity.errors';
import {
  GOOGLE_OAUTH_CLIENT,
  GoogleOAuthClient,
  GoogleProfile,
} from '../ports/google-oauth-client.port';
import { OAUTH_STATE_STORE, OAuthStateStore } from '../ports/oauth-state-store.port';
import { EMAIL_SENDER, EmailSender } from '../ports/email-sender.port';
import { STORE_LOOKUP, StoreLookup } from '../ports/store-lookup.port';
import { generateOpaqueToken, hashToken } from '../util/secure-token';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshTokenPlain: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokens: VerificationTokenRepository,
    @Inject(GOOGLE_OAUTH_CLIENT) private readonly googleClient: GoogleOAuthClient,
    @Inject(OAUTH_STATE_STORE) private readonly oauthStateStore: OAuthStateStore,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(STORE_LOOKUP) private readonly storeLookup: StoreLookup,
    private readonly transactionManager: TransactionManager,
    private readonly jwt: AppJwtService,
    private readonly config: AppConfigService,
    private readonly tokenRotation: TokenRotationService,
  ) {}

  // ---- Registration & password login (.docs/07-auth.md §1a) ----

  async register(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<Result<User, EmailError | PasswordHashError | EmailAlreadyRegisteredError>> {
    const emailResult = Email.create(params.email);
    if (emailResult.isErr()) {
      return Result.err(emailResult.unwrapErr());
    }
    const email = emailResult.unwrap();

    const existing = await this.users.findByEmail(email.value);
    if (existing) {
      return Result.err(new EmailAlreadyRegisteredError(email.value));
    }

    const passwordHashResult = await PasswordHash.fromPlainText(params.password);
    if (passwordHashResult.isErr()) {
      return Result.err(passwordHashResult.unwrapErr());
    }

    const user = User.registerWithPassword({
      email,
      passwordHash: passwordHashResult.unwrap(),
      name: params.name,
    });

    await this.users.save(user);
    await this.issueAndSendVerificationEmail(user);
    this.logEvents(user);

    return Result.ok(user);
  }

  async login(params: {
    email: string;
    password: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<Result<AuthResult, InvalidCredentialsError | EmailNotVerifiedError>> {
    const emailResult = Email.create(params.email);
    if (emailResult.isErr()) {
      return Result.err(new InvalidCredentialsError());
    }

    const user = await this.users.findByEmail(emailResult.unwrap().value);
    if (!user || !user.passwordHash) {
      return Result.err(new InvalidCredentialsError());
    }

    const passwordMatches = await user.verifyPassword(params.password);
    if (!passwordMatches) {
      return Result.err(new InvalidCredentialsError());
    }

    if (!user.isEmailVerified()) {
      return Result.err(new EmailNotVerifiedError());
    }

    const authResult = await this.issueTokenPair(user, params.userAgent, params.ip);
    return Result.ok(authResult);
  }

  async verifyEmail(tokenPlain: string): Promise<Result<void, InvalidOrExpiredTokenError>> {
    const token = await this.verificationTokens.findByHash(hashToken(tokenPlain));
    if (!token || token.purpose !== 'email_verification' || !token.isValid()) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const user = await this.users.findById(token.userId);
    if (!user) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    await this.transactionManager.runInTransaction(async () => {
      user.verifyEmailNow();
      token.markUsed();
      await this.users.save(user);
      await this.verificationTokens.save(token);
    });
    this.logEvents(user);

    return Result.ok(undefined);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const emailResult = Email.create(email);
    if (emailResult.isErr()) return;
    const user = await this.users.findByEmail(emailResult.unwrap().value);
    if (!user || user.isEmailVerified()) return;
    await this.issueAndSendVerificationEmail(user);
  }

  // ---- Forgot / reset password ----

  async requestPasswordReset(email: string): Promise<void> {
    const emailResult = Email.create(email);
    if (emailResult.isErr()) return;
    const user = await this.users.findByEmail(emailResult.unwrap().value);
    if (!user) return;
    // A user with a Google-only login and no password never had one to
    // reset — adding a password is the explicit-authenticated-action-only
    // set-password flow (.docs/07-auth.md §1b), not a password-reset
    // backdoor into a Google account. The one exception is a true guest —
    // no password AND no Google id, created only via a Sprint 9 manual
    // order — for whom this is the sole path to claiming their account.
    if (!user.passwordHash && user.googleId) return;

    const tokenPlain = generateOpaqueToken();
    const token = VerificationToken.issue({
      userId: user.id,
      tokenHash: hashToken(tokenPlain),
      purpose: 'password_reset',
      ttlMs: PASSWORD_RESET_TOKEN_TTL_MS,
    });

    await this.verificationTokens.invalidateOutstanding(user.id, 'password_reset');
    await this.verificationTokens.save(token);
    await this.emailSender.sendPasswordResetEmail({
      to: user.email.value,
      name: user.name,
      token: tokenPlain,
    });
  }

  async resetPassword(
    tokenPlain: string,
    newPassword: string,
  ): Promise<Result<void, InvalidOrExpiredTokenError | PasswordHashError>> {
    const token = await this.verificationTokens.findByHash(hashToken(tokenPlain));
    if (!token || token.purpose !== 'password_reset' || !token.isValid()) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const user = await this.users.findById(token.userId);
    if (!user) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const passwordHashResult = await PasswordHash.fromPlainText(newPassword);
    if (passwordHashResult.isErr()) {
      return Result.err(passwordHashResult.unwrapErr());
    }

    await this.transactionManager.runInTransaction(async () => {
      user.setPasswordHash(passwordHashResult.unwrap());
      // Completing a reset via a token emailed to this address is itself
      // proof of mailbox ownership — at least as strong as clicking a
      // verification link. Without this, a Sprint 9 guest buyer (registered
      // with emailVerifiedAt: null, no welcome/verification email ever
      // sent) could reset a password they could then never use to log in.
      user.verifyEmailNow();
      token.markUsed();
      await this.users.save(user);
      await this.verificationTokens.save(token);
      await this.refreshTokens.revokeAllForUser(user.id);
    });
    this.logEvents(user);

    return Result.ok(undefined);
  }

  // ---- Google OAuth (.docs/07-auth.md §1) ----

  async createGoogleAuthorizationUrl(redirectUri: string): Promise<string> {
    const request = await this.googleClient.createAuthorizationRequest(redirectUri);
    await this.oauthStateStore.save(request.state, {
      codeVerifier: request.codeVerifier,
      redirectUri,
    });
    return request.url;
  }

  async handleGoogleCallback(params: {
    code: string;
    state: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<Result<AuthResult, InvalidOrExpiredTokenError | AccountLinkingViolationError>> {
    const stateRecord = await this.oauthStateStore.consume(params.state);
    if (!stateRecord) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const profile = await this.googleClient.exchangeCode({
      code: params.code,
      codeVerifier: stateRecord.codeVerifier,
      redirectUri: stateRecord.redirectUri,
    });

    return this.loginOrRegisterWithGoogle(profile, params.userAgent, params.ip);
  }

  async loginWithGoogleIdToken(params: {
    idToken: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<Result<AuthResult, AccountLinkingViolationError>> {
    const profile = await this.googleClient.verifyIdToken(params.idToken);
    return this.loginOrRegisterWithGoogle(profile, params.userAgent, params.ip);
  }

  private async loginOrRegisterWithGoogle(
    profile: GoogleProfile,
    userAgent?: string | null,
    ip?: string | null,
  ): Promise<Result<AuthResult, AccountLinkingViolationError>> {
    const byGoogleId = await this.users.findByGoogleId(profile.googleId);
    if (byGoogleId) {
      const authResult = await this.issueTokenPair(byGoogleId, userAgent, ip);
      return Result.ok(authResult);
    }

    const byEmail = await this.users.findByEmail(profile.email);
    if (byEmail) {
      // Per .docs/07-auth.md §1b: never link implicitly during login, even on an email match.
      return Result.err(
        new AccountLinkingViolationError(
          'An account with this email already exists. Sign in with your password and connect Google from settings.',
        ),
      );
    }

    const emailResult = Email.create(profile.email);
    if (emailResult.isErr()) {
      return Result.err(new AccountLinkingViolationError('Google account has no usable email'));
    }

    const user = User.registerFromGoogle({
      googleId: profile.googleId,
      email: emailResult.unwrap(),
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });

    await this.users.save(user);
    this.logEvents(user);

    const authResult = await this.issueTokenPair(user, userAgent, ip);
    return Result.ok(authResult);
  }

  // ---- Session lifecycle ----

  async refresh(params: {
    refreshTokenPlain: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<Result<AuthResult, InvalidOrExpiredTokenError>> {
    const presented = await this.refreshTokens.findByHash(hashToken(params.refreshTokenPlain));
    if (!presented) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const newTokenPlain = generateOpaqueToken();
    const rotationResult = this.tokenRotation.rotate({
      presented,
      newTokenHash: hashToken(newTokenPlain),
      ttlMs: this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
      userAgent: params.userAgent,
      ip: params.ip,
    });

    if (rotationResult.isErr()) {
      return Result.err(rotationResult.unwrapErr());
    }

    const outcome = rotationResult.unwrap();

    if (outcome.kind === 'reuse_detected') {
      await this.refreshTokens.revokeFamily(outcome.familyId);
      this.logger.warn(
        `identity.refresh_token_reuse_detected user=${outcome.userId} family=${outcome.familyId}`,
      );
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const user = await this.users.findById(outcome.issued.userId);
    if (!user) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    await this.transactionManager.runInTransaction(async () => {
      await this.refreshTokens.save(outcome.revoked);
      await this.refreshTokens.save(outcome.issued);
    });

    const storeId = await this.storeLookup.findStoreIdByOwner(user.id);
    const accessToken = await this.jwt.signAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role.value,
      storeId: storeId ?? undefined,
    });

    return Result.ok({
      user,
      accessToken,
      refreshTokenPlain: newTokenPlain,
      refreshTokenExpiresAt: outcome.issued.expiresAt,
    });
  }

  async logout(refreshTokenPlain: string): Promise<void> {
    const token = await this.refreshTokens.findByHash(hashToken(refreshTokenPlain));
    if (token && !token.isRevoked()) {
      token.revoke();
      await this.refreshTokens.save(token);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  async listSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokens.findActiveByUserId(userId);
  }

  // ---- helpers ----

  private async issueTokenPair(
    user: User,
    userAgent?: string | null,
    ip?: string | null,
  ): Promise<AuthResult> {
    const refreshTokenPlain = generateOpaqueToken();
    const family = TokenFamily.create();
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);

    const refreshToken = RefreshToken.issue({
      userId: user.id,
      tokenHash: hashToken(refreshTokenPlain),
      familyId: family.id,
      expiresAt,
      userAgent,
      ip,
    });

    await this.refreshTokens.save(refreshToken);

    const storeId = await this.storeLookup.findStoreIdByOwner(user.id);
    const accessToken = await this.jwt.signAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role.value,
      storeId: storeId ?? undefined,
    });

    return { user, accessToken, refreshTokenPlain, refreshTokenExpiresAt: expiresAt };
  }

  private async issueAndSendVerificationEmail(user: User): Promise<void> {
    const tokenPlain = generateOpaqueToken();
    const token = VerificationToken.issue({
      userId: user.id,
      tokenHash: hashToken(tokenPlain),
      purpose: 'email_verification',
      ttlMs: VERIFICATION_TOKEN_TTL_MS,
    });

    await this.verificationTokens.invalidateOutstanding(user.id, 'email_verification');
    await this.verificationTokens.save(token);
    await this.emailSender.sendVerificationEmail({
      to: user.email.value,
      name: user.name,
      token: tokenPlain,
    });
  }

  private logEvents(user: User): void {
    for (const event of user.pullDomainEvents()) {
      this.logger.log(`Domain event: ${event.eventName}`);
    }
  }
}
