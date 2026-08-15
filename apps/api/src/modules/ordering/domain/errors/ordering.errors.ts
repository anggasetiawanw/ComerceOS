import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class OrderNotFoundError extends DomainError {
  readonly code = 'ORDERING.ORDER_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Order not found');
  }
}

export class IllegalTransitionError extends DomainError {
  readonly code = 'ORDERING.ILLEGAL_TRANSITION';
  readonly status = 409;

  constructor(from: string, to: string) {
    super(`Cannot transition order from "${from}" to "${to}"`);
  }
}

export class HoldingPeriodNotElapsedError extends DomainError {
  readonly code = 'ORDERING.HOLDING_PERIOD_NOT_ELAPSED';
  readonly status = 422;

  constructor(holdingUntil: Date) {
    super(`Holding period has not elapsed yet (releases at ${holdingUntil.toISOString()})`);
  }
}

export class EmptyBasketError extends DomainError {
  readonly code = 'ORDERING.EMPTY_BASKET';
  readonly status = 422;

  constructor() {
    super('A checkout basket must contain at least one item');
  }
}

export class ProductNotAvailableError extends DomainError {
  readonly code = 'ORDERING.PRODUCT_NOT_AVAILABLE';
  readonly status = 422;

  constructor(productId: string) {
    super(`Product "${productId}" is not available for purchase`);
  }
}

export class InsufficientStockError extends DomainError {
  readonly code = 'ORDERING.INSUFFICIENT_STOCK';
  readonly status = 422;

  constructor(productId: string) {
    super(`Product "${productId}" does not have enough stock`);
  }
}

export class MixedStoreBasketError extends DomainError {
  readonly code = 'ORDERING.MIXED_STORE_BASKET';
  readonly status = 422;

  constructor() {
    super('All items in a checkout basket must belong to the same store');
  }
}

export class InvalidOrderError extends DomainError {
  readonly code = 'ORDERING.INVALID_ORDER';
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}

export class StoreNotFoundForOrderError extends DomainError {
  readonly code = 'ORDERING.STORE_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Store not found');
  }
}

export class InquiryNotFoundError extends DomainError {
  readonly code = 'ORDERING.INQUIRY_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Inquiry not found');
  }
}

export class InquiryAlreadyConvertedError extends DomainError {
  readonly code = 'ORDERING.INQUIRY_ALREADY_CONVERTED';
  readonly status = 409;

  constructor() {
    super('This inquiry has already been converted to an order');
  }
}

export class InquiryAlreadyLostError extends DomainError {
  readonly code = 'ORDERING.INQUIRY_ALREADY_LOST';
  readonly status = 409;

  constructor() {
    super('This inquiry has already been marked lost');
  }
}

export class ManualOrderSourceRequiredError extends DomainError {
  readonly code = 'ORDERING.MANUAL_ORDER_SOURCE_REQUIRED';
  readonly status = 422;

  constructor() {
    super('Payment can only be confirmed manually on a manually-created order');
  }
}

export class ProductNotFoundForStoreError extends DomainError {
  readonly code = 'ORDERING.PRODUCT_NOT_FOUND_FOR_STORE';
  readonly status = 404;

  constructor(productId: string) {
    super(`Product "${productId}" does not belong to this store`);
  }
}
