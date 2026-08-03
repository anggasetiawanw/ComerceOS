import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { STORAGE_UPLOADER, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { Invoice } from '../../domain/entities/invoice.aggregate';
import { INVOICE_REPOSITORY, InvoiceRepository } from '../../domain/repositories/invoice.repository';
import {
  INVOICE_READ_REPOSITORY,
  InvoiceListRow,
  InvoiceReadRepository,
} from '../../domain/repositories/invoice-read.repository';
import { InvoiceNotFoundError, InvoicePdfNotReadyError } from '../../domain/errors/invoicing.errors';

const SIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class InvoiceReadService {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(INVOICE_READ_REPOSITORY) private readonly reads: InvoiceReadRepository,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
  ) {}

  async listByStore(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: InvoiceListRow[]; hasMore: boolean }> {
    return this.reads.listByStore(params);
  }

  // storeId is required and checked here, not left to the controller — a
  // seller must not be able to read another seller's invoice by guessing
  // an id. Not-found rather than forbidden on a mismatch, same
  // information-hiding precedent as ReleaseOrderService.
  async getForStore(id: string, storeId: string): Promise<Result<Invoice, InvoiceNotFoundError>> {
    const invoice = await this.invoices.findById(id);
    if (!invoice || invoice.storeId !== storeId) return Result.err(new InvoiceNotFoundError());
    return Result.ok(invoice);
  }

  async getByOrderId(orderId: string): Promise<Result<Invoice, InvoiceNotFoundError>> {
    const invoice = await this.invoices.findByOrderId(orderId);
    return invoice ? Result.ok(invoice) : Result.err(new InvoiceNotFoundError());
  }

  async getSignedPdfUrlForStore(
    id: string,
    storeId: string,
  ): Promise<Result<{ url: string; expiresAt: Date }, InvoiceNotFoundError | InvoicePdfNotReadyError>> {
    const invoice = await this.invoices.findById(id);
    if (!invoice || invoice.storeId !== storeId) return Result.err(new InvoiceNotFoundError());
    return this.signedUrlFor(invoice);
  }

  async getSignedPdfUrlForOrder(
    invoice: Invoice,
  ): Promise<Result<{ url: string; expiresAt: Date }, InvoicePdfNotReadyError>> {
    return this.signedUrlFor(invoice);
  }

  private async signedUrlFor(
    invoice: Invoice,
  ): Promise<Result<{ url: string; expiresAt: Date }, InvoicePdfNotReadyError>> {
    if (!invoice.pdfUrl) return Result.err(new InvoicePdfNotReadyError());

    const url = await this.storage.createSignedUrl({
      bucket: 'private',
      path: invoice.pdfUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
    return Result.ok({ url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000) });
  }
}
