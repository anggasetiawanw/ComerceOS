export const INVOICE_READ_REPOSITORY = Symbol('INVOICE_READ_REPOSITORY');

export interface InvoiceListRow {
  id: string;
  orderId: string;
  invoiceNumber: string;
  pdfUrl: string | null;
  sentVia: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface InvoiceReadRepository {
  listByStore(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: InvoiceListRow[]; hasMore: boolean }>;
}
