import { Inject, Injectable } from '@nestjs/common';
import { renderInvoiceHtml } from '@nagihin/contracts';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { STORAGE_UPLOADER, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { USER_REPOSITORY, UserRepository } from '../../../identity/domain/repositories/user.repository';
import { OrderReadService } from '../../../ordering/application/services/order-read.service';
import { OrderStatusValue } from '../../../ordering/domain/value-objects/order-status.vo';
import { Invoice } from '../../domain/entities/invoice.aggregate';
import { InvoiceNumber } from '../../domain/value-objects/invoice-number.vo';
import { InvoiceViewModelBuilder } from '../../domain/services/invoice-view-model.builder';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/repositories/invoice.repository';
import { InvoiceNotFoundError, OrderNotEligibleForInvoiceError } from '../../domain/errors/invoicing.errors';
import { INVOICE_NUMBER_ALLOCATOR, InvoiceNumberAllocator } from '../ports/invoice-number-allocator.port';
import { PDF_RENDERER, PdfRenderer } from '../ports/pdf-renderer.port';

const INVOICE_ELIGIBLE_STATUSES: readonly OrderStatusValue[] = ['paid', 'holding', 'released'];

@Injectable()
export class InvoiceService {
  private readonly viewModelBuilder = new InvoiceViewModelBuilder();

  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(INVOICE_NUMBER_ALLOCATOR) private readonly allocator: InvoiceNumberAllocator,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PDF_RENDERER) private readonly pdfRenderer: PdfRenderer,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
    private readonly orderReads: OrderReadService,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
  ) {}

  // Phase A (.docs/09 §6, .docs/10 §"generate-invoice"): fast, transactional,
  // allocates a number only if no invoice exists yet for this order. A
  // retry (redelivered OrderPaid, or a phase-B failure that never got here)
  // finds the existing row and returns it — no second number is consumed.
  async generateForOrder(orderId: string): Promise<Result<Invoice, OrderNotEligibleForInvoiceError>> {
    return this.transactionManager.runInTransaction(async () => {
      const existing = await this.invoices.findByOrderId(orderId);
      if (existing) return Result.ok(existing);

      const order = await this.orderReads.findById(orderId);
      if (!order || !INVOICE_ELIGIBLE_STATUSES.includes(order.status.value)) {
        return Result.err(new OrderNotEligibleForInvoiceError(orderId));
      }

      const store = await this.stores.findById(order.storeId);
      const buyer = await this.users.findById(order.buyerId);
      if (!store || !buyer) {
        return Result.err(new OrderNotEligibleForInvoiceError(orderId));
      }

      const counter = await this.allocator.allocate(order.storeId);
      const invoiceNumber = InvoiceNumber.fromCounter(counter);
      const snapshot = this.viewModelBuilder.build({
        invoiceNumber: invoiceNumber.value,
        order,
        store: { displayName: store.profile.displayName, username: store.username.value },
        buyer: { name: buyer.name, email: buyer.email.value },
      });

      const invoice = Invoice.fromOrder({ orderId, storeId: order.storeId, invoiceNumber, snapshot });
      await this.invoices.save(invoice);
      await this.outbox.enqueueAll(invoice.pullDomainEvents());
      return Result.ok(invoice);
    });
  }

  // Phase B (.docs §6.3): deliberately outside any transaction. A Puppeteer
  // render takes seconds; TransactionManager.runInTransaction has no
  // options passed today so Prisma's 5s interactive-transaction default
  // applies, and holding the stores row lock across a multi-second render
  // would block the ledger for no reason. A render failure retries without
  // burning a number, since phase A already committed.
  async renderAndUpload(invoiceId: string): Promise<Result<Invoice, InvoiceNotFoundError>> {
    const invoice = await this.invoices.findById(invoiceId);
    if (!invoice) return Result.err(new InvoiceNotFoundError());
    if (invoice.isRendered) return Result.ok(invoice);

    const html = renderInvoiceHtml(invoice.snapshot);
    const pdf = await this.pdfRenderer.render(html);
    const path = `invoices/${invoice.storeId}/${invoice.invoiceNumber.value}.pdf`;
    const uploaded = await this.storage.upload({ bucket: 'private', path, contentType: 'application/pdf', body: pdf });

    invoice.markRendered(uploaded.path);
    await this.invoices.save(invoice);
    return Result.ok(invoice);
  }
}
