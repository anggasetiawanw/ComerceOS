import { DomainError } from './domain.error';

// 400, not 422: a malformed cursor is a bad request, not a domain-rule
// violation — the client sent garbage, not a value that violates business
// logic.
export class InvalidCursorError extends DomainError {
  readonly code = 'PAGINATION.INVALID_CURSOR';
  readonly status = 400;

  constructor() {
    super('Cursor tidak valid atau rusak');
  }
}
