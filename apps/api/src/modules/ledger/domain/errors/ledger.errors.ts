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

export class BankAccountNotFoundError extends DomainError {
  readonly code = 'LEDGER.BANK_ACCOUNT_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Bank account not found');
  }
}

export class BankAccountInUseError extends DomainError {
  readonly code = 'LEDGER.BANK_ACCOUNT_IN_USE';
  readonly status = 409;

  constructor() {
    super('Cannot remove a bank account referenced by a pending withdrawal');
  }
}

export class WithdrawalNotFoundError extends DomainError {
  readonly code = 'LEDGER.WITHDRAWAL_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Withdrawal not found');
  }
}

export class IllegalWithdrawalTransitionError extends DomainError {
  readonly code = 'LEDGER.ILLEGAL_WITHDRAWAL_TRANSITION';
  readonly status = 409;

  constructor(from: string, to: string) {
    super(`Cannot transition withdrawal from "${from}" to "${to}"`);
  }
}

export class BelowMinimumWithdrawalError extends DomainError {
  readonly code = 'LEDGER.BELOW_MINIMUM_WITHDRAWAL';
  readonly status = 422;

  constructor(minimum: string) {
    super(`Withdrawal amount must be at least Rp${minimum}`);
  }
}

export class InsufficientWithdrawableBalanceError extends DomainError {
  readonly code = 'LEDGER.INSUFFICIENT_WITHDRAWABLE_BALANCE';
  readonly status = 422;

  constructor() {
    super('Requested amount exceeds the withdrawable balance (available minus pending withdrawals)');
  }
}

export class NoDefaultBankAccountError extends DomainError {
  readonly code = 'LEDGER.NO_DEFAULT_BANK_ACCOUNT';
  readonly status = 422;

  constructor() {
    super('A default bank account is required before requesting a withdrawal');
  }
}

export class PendingWithdrawalExistsError extends DomainError {
  readonly code = 'LEDGER.PENDING_WITHDRAWAL_EXISTS';
  readonly status = 409;

  constructor() {
    super('Only one pending withdrawal is allowed per store at a time');
  }
}

export class StoreHasDisputedOrderError extends DomainError {
  readonly code = 'LEDGER.STORE_HAS_DISPUTED_ORDER';
  readonly status = 422;

  constructor() {
    super('Cannot request a withdrawal while a dispute is open on this store');
  }
}
