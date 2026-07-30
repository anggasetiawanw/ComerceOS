import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class ProductNotFoundError extends DomainError {
  readonly code = 'CATALOG.PRODUCT_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Product not found');
  }
}

export class SlugTakenError extends DomainError {
  readonly code = 'CATALOG.SLUG_TAKEN';
  readonly status = 409;

  constructor(slug: string) {
    super(`Slug "${slug}" is already in use for this store`);
  }
}

export class InvalidSlugError extends DomainError {
  readonly code = 'CATALOG.INVALID_SLUG';
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}

export class InvalidProductError extends DomainError {
  readonly code = 'CATALOG.INVALID_PRODUCT';
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}

export class DigitalProductRequiresFileError extends DomainError {
  readonly code = 'CATALOG.DIGITAL_FILE_REQUIRED';
  readonly status = 422;

  constructor() {
    super('A digital product needs at least one digital file before it can be published');
  }
}

export class ProductImageLimitExceededError extends DomainError {
  readonly code = 'CATALOG.PRODUCT_IMAGE_LIMIT';
  readonly status = 422;

  constructor(limit: number) {
    super(`A product can have at most ${limit} images`);
  }
}

export class ProductImageNotFoundError extends DomainError {
  readonly code = 'CATALOG.PRODUCT_IMAGE_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Product image not found');
  }
}

export class DigitalFileLimitExceededError extends DomainError {
  readonly code = 'CATALOG.DIGITAL_FILE_LIMIT';
  readonly status = 422;

  constructor(limit: number) {
    super(`A product can have at most ${limit} digital files`);
  }
}

export class DigitalFileNotFoundError extends DomainError {
  readonly code = 'CATALOG.DIGITAL_FILE_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Digital file not found');
  }
}

export class LastDigitalFileRequiredError extends DomainError {
  readonly code = 'CATALOG.LAST_DIGITAL_FILE_REQUIRED';
  readonly status = 422;

  constructor() {
    super('Cannot remove the last digital file from an active digital product');
  }
}
