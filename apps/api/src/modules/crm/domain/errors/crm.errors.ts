import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class StoreBuyerNotFoundError extends DomainError {
  readonly code = 'CRM.STORE_BUYER_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Buyer not found for this store');
  }
}
