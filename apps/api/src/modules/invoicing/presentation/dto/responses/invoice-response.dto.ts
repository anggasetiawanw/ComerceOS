import { Invoice } from '../../../domain/entities/invoice.aggregate';
import { InvoiceListRow } from '../../../domain/repositories/invoice-read.repository';

export class InvoiceResponseDto {
  id!: string;
  orderId!: string;
  invoiceNumber!: string;
  isRendered!: boolean;
  sentVia!: string | null;
  sentAt!: string | null;
  createdAt!: string;

  static fromDomain(invoice: Invoice): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = invoice.id;
    dto.orderId = invoice.orderId;
    dto.invoiceNumber = invoice.invoiceNumber.value;
    dto.isRendered = invoice.isRendered;
    dto.sentVia = invoice.sentVia;
    dto.sentAt = invoice.sentAt ? invoice.sentAt.toISOString() : null;
    dto.createdAt = invoice.createdAt.toISOString();
    return dto;
  }

  static fromRow(row: InvoiceListRow): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = row.id;
    dto.orderId = row.orderId;
    dto.invoiceNumber = row.invoiceNumber;
    dto.isRendered = row.pdfUrl !== null;
    dto.sentVia = row.sentVia;
    dto.sentAt = row.sentAt ? row.sentAt.toISOString() : null;
    dto.createdAt = row.createdAt.toISOString();
    return dto;
  }
}

export class InvoicePdfResponseDto {
  url!: string;
  expiresAt!: string;

  static of(url: string, expiresAt: Date): InvoicePdfResponseDto {
    const dto = new InvoicePdfResponseDto();
    dto.url = url;
    dto.expiresAt = expiresAt.toISOString();
    return dto;
  }
}
