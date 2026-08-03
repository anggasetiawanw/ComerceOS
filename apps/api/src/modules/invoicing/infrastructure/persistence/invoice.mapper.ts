import { InvoiceViewModel } from '@nagihin/contracts';
import { Prisma, Invoice as PrismaInvoice } from '@prisma/client';
import { Invoice } from '../../domain/entities/invoice.aggregate';
import { InvoiceNumber } from '../../domain/value-objects/invoice-number.vo';

// Same "Corrupt row" reconstruction convention as the rest of the codebase's
// mappers, applied to a jsonb column whose shape TypeScript can't verify
// across the Prisma boundary.
const isInvoiceViewModel = (value: unknown): value is InvoiceViewModel => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.invoiceNumber === 'string' && Array.isArray(record.items);
};

export class InvoiceMapper {
  static toDomain(row: PrismaInvoice): Invoice {
    const invoiceNumberResult = InvoiceNumber.create(row.invoiceNumber);
    if (invoiceNumberResult.isErr()) {
      throw new Error(`Corrupt invoices row: invalid invoice number "${row.invoiceNumber}" for invoice "${row.id}"`);
    }
    if (!isInvoiceViewModel(row.snapshot)) {
      throw new Error(`Corrupt invoices row: invalid snapshot for invoice "${row.id}"`);
    }

    return Invoice.reconstitute(
      {
        orderId: row.orderId,
        storeId: row.storeId,
        invoiceNumber: invoiceNumberResult.unwrap(),
        pdfUrl: row.pdfUrl,
        renderedAt: row.renderedAt,
        sentVia: row.sentVia,
        sentAt: row.sentAt,
        snapshot: row.snapshot,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(invoice: Invoice): Prisma.InvoiceUncheckedCreateInput {
    return {
      id: invoice.id,
      orderId: invoice.orderId,
      storeId: invoice.storeId,
      invoiceNumber: invoice.invoiceNumber.value,
      pdfUrl: invoice.pdfUrl,
      renderedAt: invoice.renderedAt,
      sentVia: invoice.sentVia,
      sentAt: invoice.sentAt,
      // Same Json-boundary cast precedent as outbox.repository.ts and
      // webhook-event.mapper.ts — InvoiceViewModel is contractually
      // JSON-safe (money as decimal strings, dates as ISO strings). The
      // `unknown` hop is required because InvoiceViewModel's named fields
      // (unlike Record<string, unknown>) have no index signature for
      // TypeScript to structurally match against InputJsonValue directly.
      snapshot: invoice.snapshot as unknown as Prisma.InputJsonValue,
      createdAt: invoice.createdAt,
    };
  }

  static toPersistenceUpdate(invoice: Invoice): Prisma.InvoiceUncheckedUpdateInput {
    return {
      pdfUrl: invoice.pdfUrl,
      renderedAt: invoice.renderedAt,
      sentVia: invoice.sentVia,
      sentAt: invoice.sentAt,
    };
  }
}
