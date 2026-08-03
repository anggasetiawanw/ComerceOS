import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class StoreBalanceNotFoundError extends DomainError {
  readonly code = 'LEDGER.STORE_BALANCE_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Store balance not found');
  }
}

export class InsufficientHoldingBalanceError extends DomainError {
  readonly code = 'LEDGER.INSUFFICIENT_HOLDING_BALANCE';
  readonly status = 422;

  constructor() {
    super('Cannot release more than the current holding balance');
  }
}

export class InsufficientAvailableBalanceError extends DomainError {
  readonly code = 'LEDGER.INSUFFICIENT_AVAILABLE_BALANCE';
  readonly status = 422;

  constructor() {
    super('Cannot debit more than the current available balance');
  }
}

export class OrderNotEligibleForLedgerError extends DomainError {
  readonly code = 'LEDGER.ORDER_NOT_ELIGIBLE';
  readonly status = 422;

  constructor(orderId: string, reason: string) {
    super(`Order "${orderId}" is not eligible for this ledger movement: ${reason}`);
  }
}
