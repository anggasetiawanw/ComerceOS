import { Invoice } from '../entities/invoice.aggregate';

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');

export interface InvoiceRepository {
  findByOrderId(orderId: string): Promise<Invoice | null>;
  findById(id: string): Promise<Invoice | null>;
  save(invoice: Invoice): Promise<void>;
}
