import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { StoreBuyerReadRepository, StoreBuyerRow, StoreBuyerSort } from '../../domain/repositories/store-buyer-read.repository';

interface RawStoreBuyerRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_avatar_url: string | null;
  first_purchase_at: Date;
  last_purchase_at: Date;
  total_orders: number;
  total_spent: bigint;
  tags: string[];
}

const sortColumnFor = (sort: StoreBuyerSort): Prisma.Sql => {
  if (sort === 'total_spent') return Prisma.sql`sb.total_spent`;
  if (sort === 'total_orders') return Prisma.sql`sb.total_orders`;
  return Prisma.sql`sb.last_purchase_at`;
};

const cursorClauseFor = (sort: StoreBuyerSort, cursor?: { sortValue: string; id: string }): Prisma.Sql => {
  if (!cursor) return Prisma.empty;
  if (sort === 'total_spent') {
    return Prisma.sql`AND (sb.total_spent, sb.id) < (${BigInt(cursor.sortValue)}, ${cursor.id})`;
  }
  if (sort === 'total_orders') {
    return Prisma.sql`AND (sb.total_orders, sb.id) < (${Number(cursor.sortValue)}, ${cursor.id})`;
  }
  return Prisma.sql`AND (sb.last_purchase_at, sb.id) < (${new Date(cursor.sortValue)}, ${cursor.id})`;
};

@Injectable()
export class StoreBuyerReadPrismaRepository implements StoreBuyerReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByStore(params: {
    storeId: string;
    search?: string;
    sort: StoreBuyerSort;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: StoreBuyerRow[]; hasMore: boolean }> {
    const searchClause = params.search
      ? Prisma.sql`AND (u.name ILIKE ${'%' + params.search + '%'} OR u.email ILIKE ${'%' + params.search + '%'})`
      : Prisma.empty;
    const sortColumn = sortColumnFor(params.sort);
    const cursorClause = cursorClauseFor(params.sort, params.cursor);

    const rows = await this.prisma.$queryRaw<RawStoreBuyerRow[]>`
      SELECT sb.id, u.name AS buyer_name, u.email AS buyer_email, u.avatar_url AS buyer_avatar_url,
             sb.first_purchase_at, sb.last_purchase_at, sb.total_orders, sb.total_spent, sb.tags
      FROM store_buyers sb
      JOIN users u ON u.id = sb.buyer_id
      WHERE sb.store_id = ${params.storeId}
      ${searchClause}
      ${cursorClause}
      ORDER BY ${sortColumn} DESC, sb.id DESC
      LIMIT ${params.limit + 1}
    `;

    const hasMore = rows.length > params.limit;
    const kept = hasMore ? rows.slice(0, params.limit) : rows;

    return {
      hasMore,
      rows: kept.map((row) => ({
        id: row.id,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        buyerAvatarUrl: row.buyer_avatar_url,
        firstPurchaseAt: row.first_purchase_at,
        lastPurchaseAt: row.last_purchase_at,
        totalOrders: row.total_orders,
        totalSpent: row.total_spent.toString(),
        tags: row.tags,
      })),
    };
  }
}
