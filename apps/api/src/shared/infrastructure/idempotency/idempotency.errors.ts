import { DomainError } from '../../domain-errors/domain.error';

export class IdempotencyKeyConflictError extends DomainError {
  readonly code = 'IDEMPOTENCY.KEY_CONFLICT';
  readonly status = 409;

  constructor() {
    super('This Idempotency-Key was already used with a different request body');
  }
}

export class IdempotencyKeyInFlightError extends DomainError {
  readonly code = 'IDEMPOTENCY.KEY_IN_FLIGHT';
  readonly status = 409;

  constructor() {
    super('A request with this Idempotency-Key is already being processed');
  }
}
