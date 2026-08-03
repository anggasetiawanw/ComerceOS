import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class DeliveryNotFoundError extends DomainError {
  readonly code = 'DELIVERY.NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Delivery not found');
  }
}

export class DownloadLimitReachedError extends DomainError {
  readonly code = 'DELIVERY.DOWNLOAD_LIMIT_REACHED';
  readonly status = 422;

  constructor() {
    super('This file has reached its download limit');
  }
}

export class InvalidDeliveryError extends DomainError {
  readonly code = 'DELIVERY.INVALID';
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}
