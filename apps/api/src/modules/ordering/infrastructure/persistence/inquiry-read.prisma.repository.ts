import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { InquiryListItem, InquiryReadRepository } from '../../domain/repositories/inquiry-read.repository';

interface InquiryRow {
  id: string;
  status: string;
  product_id: string | null;
  product_name: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  created_at: Date;
}

@Injectable()
export class InquiryReadPrismaRepository implements InquiryReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByStore(
    storeId: string,
    params: { status?: string; page: number; limit: number },
  ): Promise<{ items: InquiryListItem[]; total: number }> {
    const offset = (params.page - 1) * params.limit;
    const statusClause = params.status ? Prisma.sql`AND i.status::text = ${params.status}` : Prisma.empty;

    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<InquiryRow[]>`
        SELECT i.id, i.status::text AS status, i.product_id,
               p.name AS product_name, u.name AS buyer_name, u.email AS buyer_email, i.created_at
        FROM inquiries i
        LEFT JOIN products p ON p.id = i.product_id
        LEFT JOIN users u ON u.id = i.buyer_id
        WHERE i.store_id = ${storeId}
        ${statusClause}
        ORDER BY i.created_at DESC
        LIMIT ${params.limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count FROM inquiries i WHERE i.store_id = ${storeId} ${statusClause}
      `,
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        productId: row.product_id,
        productName: row.product_name,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        createdAt: row.created_at,
      })),
      total: Number(totalRows[0]?.count ?? 0n),
    };
  }
}
