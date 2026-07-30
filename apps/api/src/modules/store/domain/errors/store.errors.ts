import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class StoreNotFoundError extends DomainError {
  readonly code = 'STORE.NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Store not found');
  }
}

export class StoreAlreadyExistsError extends DomainError {
  readonly code = 'STORE.ALREADY_EXISTS';
  readonly status = 409;

  constructor() {
    super('This account already has a store');
  }
}

export class UsernameTakenError extends DomainError {
  readonly code = 'STORE.USERNAME_TAKEN';
  readonly status = 409;

  constructor(username: string) {
    super(`Username "${username}" is already taken`);
  }
}

export class UsernameReservedError extends DomainError {
  readonly code = 'STORE.USERNAME_RESERVED';
  readonly status = 422;

  constructor(username: string) {
    super(`Username "${username}" is reserved`);
  }
}

export class InvalidUsernameError extends DomainError {
  readonly code = 'STORE.INVALID_USERNAME';
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}

export class UsernameChangeCooldownError extends DomainError {
  readonly code = 'STORE.USERNAME_CHANGE_COOLDOWN';
  readonly status = 429;

  constructor() {
    super('Username was changed recently; try again later');
  }
}

export class SocialLinkNotFoundError extends DomainError {
  readonly code = 'STORE.SOCIAL_LINK_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Social link not found');
  }
}

export class SocialLinkLimitExceededError extends DomainError {
  readonly code = 'STORE.SOCIAL_LINK_LIMIT';
  readonly status = 422;

  constructor(limit: number) {
    super(`A store can have at most ${limit} social links`);
  }
}

export class InvalidSocialLinkOrderError extends DomainError {
  readonly code = 'STORE.INVALID_SOCIAL_LINK_ORDER';
  readonly status = 422;

  constructor() {
    super('The reorder list must be an exact permutation of existing social link ids');
  }
}

export class InvalidSocialLinkError extends DomainError {
  readonly code = 'STORE.INVALID_SOCIAL_LINK';
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}
