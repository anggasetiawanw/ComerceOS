import { DomainError } from '../../../../shared/domain-errors/domain.error';

export class InvoiceNotFoundError extends DomainError {
  readonly code = 'INVOICING.INVOICE_NOT_FOUND';
  readonly status = 404;

  constructor() {
    super('Invoice not found');
  }
}

// Distinct from a bare 404 so the frontend can show "sedang dibuat" during
// the ~1s window between phase A (number allocated, row inserted) and
// phase B (PDF rendered, pdf_url set) rather than an ambiguous not-found.
export class InvoicePdfNotReadyError extends DomainError {
  readonly code = 'INVOICING.PDF_NOT_READY';
  readonly status = 422;

  constructor() {
    super('Invoice PDF is still being generated');
  }
}

export class OrderNotEligibleForInvoiceError extends DomainError {
  readonly code = 'INVOICING.ORDER_NOT_ELIGIBLE';
  readonly status = 422;

  constructor(orderId: string) {
    super(`Order "${orderId}" is not eligible for invoicing`);
  }
}
