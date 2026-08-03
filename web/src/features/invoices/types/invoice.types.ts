export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  isRendered: boolean;
  sentVia: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface InvoicePdf {
  url: string;
  expiresAt: string;
}
