import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { NotificationDispatcher } from '../../../notifications/application/services/notification-dispatcher.service';
import { NOTIFICATION_TEMPLATES } from '../../../notifications/domain/value-objects/notification-templates';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/repositories/invoice.repository';
import { InvoiceNotFoundError } from '../../domain/errors/invoicing.errors';

// Not-yet-rendered guard: invoicing.invoice_generated is enqueued (phase A)
// before the PDF exists (phase B). In practice phase B finishes
// synchronously within the same generate-invoice job, seconds before the
// outbox relay's next tick even publishes this consumer's job — but rather
// than depend on that timing, an unrendered invoice throws so BullMQ's
// configured retry (3 attempts, 10s -> 40s backoff) gives phase B time to
// finish instead of silently sending an email with no attachment.
export class InvoiceNotRenderedError extends Error {
  constructor(invoiceId: string) {
    super(`Invoice "${invoiceId}" has not finished rendering yet`);
  }
}

@Injectable()
export class InvoiceDeliveryService {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async deliverInvoice(invoiceId: string): Promise<Result<void, InvoiceNotFoundError>> {
    const invoice = await this.invoices.findById(invoiceId);
    if (!invoice) return Result.err(new InvoiceNotFoundError());
    if (!invoice.isRendered || !invoice.pdfUrl) {
      throw new InvoiceNotRenderedError(invoiceId);
    }

    await this.dispatcher.dispatch({
      template: NOTIFICATION_TEMPLATES.INVOICE_READY,
      recipient: { email: invoice.snapshot.buyer.email, phone: null },
      payload: {
        buyerName: invoice.snapshot.buyer.name,
        storeName: invoice.snapshot.store.displayName,
        invoiceNumber: invoice.invoiceNumber.value,
        totalRupiah: invoice.snapshot.totalRupiah,
      },
      attachment: {
        storageBucket: 'private',
        storagePath: invoice.pdfUrl,
        filename: `${invoice.invoiceNumber.value}.pdf`,
      },
    });

    invoice.markSent('email');
    await this.invoices.save(invoice);
    return Result.ok(undefined);
  }
}
