import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class InvalidCredentialsError extends DomainError {
  readonly code = 'IDENTITY.INVALID_CREDENTIALS';
  readonly status = 401;

  constructor() {
    super('Invalid email or password');
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'IDENTITY.EMAIL_ALREADY_REGISTERED';
  readonly status = 409;

  constructor(email: string) {
    super(`An account with email "${email}" already exists`);
  }
}

export class EmailNotVerifiedError extends DomainError {
  readonly code = 'IDENTITY.EMAIL_NOT_VERIFIED';
  readonly status = 403;

  constructor() {
    super('Email address has not been verified yet');
  }
}

export class AccountLinkingViolationError extends DomainError {
  readonly code = 'IDENTITY.ACCOUNT_LINKING_VIOLATION';
  readonly status = 409;

  constructor(message: string) {
    super(message);
  }
}

export class InvalidOrExpiredTokenError extends DomainError {
  readonly code = 'IDENTITY.INVALID_OR_EXPIRED_TOKEN';
  readonly status = 401;

  constructor() {
    super('Token is invalid, expired, or already used');
  }
}

export class RefreshTokenReuseError extends DomainError {
  readonly code = 'IDENTITY.REFRESH_TOKEN_REUSE_DETECTED';
  readonly status = 401;

  constructor() {
    super('Refresh token reuse detected; all sessions have been revoked');
  }
}
