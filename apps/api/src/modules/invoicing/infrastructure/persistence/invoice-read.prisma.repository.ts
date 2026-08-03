import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { InvoiceListRow, InvoiceReadRepository } from '../../domain/repositories/invoice-read.repository';

interface RawInvoiceRow {
  id: string;
  order_id: string;
  invoice_number: string;
  pdf_url: string | null;
  sent_via: string | null;
  sent_at: Date | null;
  created_at: Date;
}

@Injectable()
export class InvoiceReadPrismaRepository implements InvoiceReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByStore(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: InvoiceListRow[]; hasMore: boolean }> {
    const cursorClause = params.cursor
      ? Prisma.sql`AND (created_at, id) < (${new Date(params.cursor.sortValue)}, ${params.cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawInvoiceRow[]>`
      SELECT id, order_id, invoice_number, pdf_url, sent_via, sent_at, created_at
      FROM invoices
      WHERE store_id = ${params.storeId}
      ${cursorClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ${params.limit + 1}
    `;

    const hasMore = rows.length > params.limit;
    const kept = hasMore ? rows.slice(0, params.limit) : rows;

    return {
      hasMore,
      rows: kept.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        invoiceNumber: row.invoice_number,
        pdfUrl: row.pdf_url,
        sentVia: row.sent_via,
        sentAt: row.sent_at,
        createdAt: row.created_at,
      })),
    };
  }
}
