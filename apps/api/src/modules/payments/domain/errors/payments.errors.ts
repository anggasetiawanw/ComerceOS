import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class InvalidWebhookSignatureError extends DomainError {
  readonly code = 'PAYMENTS.INVALID_SIGNATURE';
  readonly status = 401;

  constructor() {
    super('Invalid webhook signature');
  }
}

export class WebhookEventNotFoundError extends DomainError {
  readonly code = 'PAYMENTS.WEBHOOK_EVENT_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Webhook event not found');
  }
}

export class OrderPaymentNotFoundError extends DomainError {
  readonly code = 'PAYMENTS.ORDER_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Order not found');
  }
}

export class OrderNotPayableError extends DomainError {
  readonly code = 'PAYMENTS.ORDER_NOT_PAYABLE';
  readonly status = 422;

  constructor(status: string) {
    super(`Order is "${status}" and can no longer accept a payment token`);
  }
}

export class SnapTokenCreationFailedError extends DomainError {
  readonly code = 'PAYMENTS.SNAP_TOKEN_FAILED';
  readonly status = 502;

  constructor(message: string) {
    super(`Failed to create a Snap transaction: ${message}`);
  }
}
