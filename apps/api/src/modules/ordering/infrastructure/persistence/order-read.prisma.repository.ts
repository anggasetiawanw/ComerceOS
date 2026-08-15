import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  BuyerOrderListResult,
  OrderReadRepository,
  PendingReleaseListItem,
  StoreOrderListFilter,
  StoreOrderListItem,
} from '../../domain/repositories/order-read.repository';

interface BuyerOrderRow {
  id: string;
  order_number: string;
  store_id: string;
  store_name: string;
  status: string;
  total: bigint;
  created_at: Date;
}

interface PendingReleaseRow {
  id: string;
  order_number: string;
  amount: bigint;
  holding_until: Date;
}

interface StoreOrderRow {
  id: string;
  order_number: string;
  source: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  total: bigint;
  created_at: Date;
}

@Injectable()
export class OrderReadPrismaRepository implements OrderReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForBuyer(buyerId: string, params: { page: number; limit: number }): Promise<BuyerOrderListResult> {
    const offset = (params.page - 1) * params.limit;

    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<BuyerOrderRow[]>`
        SELECT o.id, o.order_number, o.store_id, s.display_name AS store_name, o.status, o.total, o.created_at
        FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.buyer_id = ${buyerId}
        ORDER BY o.created_at DESC
        LIMIT ${params.limit} OFFSET ${offset}
      `,
      this.prisma.order.count({ where: { buyerId } }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        storeId: row.store_id,
        storeName: row.store_name,
        status: row.status,
        total: row.total.toString(),
        createdAt: row.created_at,
      })),
      total,
    };
  }

  async listPendingRelease(
    storeId: string,
    params: { page: number; limit: number },
  ): Promise<{ items: PendingReleaseListItem[]; total: number }> {
    const offset = (params.page - 1) * params.limit;

    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<PendingReleaseRow[]>`
        SELECT id, order_number, (total - platform_fee_amount) AS amount, holding_until
        FROM orders
        WHERE store_id = ${storeId} AND status = 'holding'
        ORDER BY holding_until ASC
        LIMIT ${params.limit} OFFSET ${offset}
      `,
      this.prisma.order.count({ where: { storeId, status: 'holding' } }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        amount: row.amount.toString(),
        holdingUntil: row.holding_until,
      })),
      total,
    };
  }

  async existsDisputedForStore(storeId: string): Promise<boolean> {
    const count = await this.prisma.order.count({ where: { storeId, status: 'disputed' } });
    return count > 0;
  }

  async listForStore(
    storeId: string,
    filter: StoreOrderListFilter,
  ): Promise<{ items: StoreOrderListItem[]; hasMore: boolean }> {
    // status/source are cast on the column, not the parameter — casting the
    // bound param instead throws "operator does not exist: OrderStatus =
    // text" (the exact bug that 500'd Sprint 7's admin queue; no test ever
    // hit it because every test omitted the filter).
    const statusClause = filter.status ? Prisma.sql`AND o.status::text = ${filter.status}` : Prisma.empty;
    const sourceClause = filter.source ? Prisma.sql`AND o.source::text = ${filter.source}` : Prisma.empty;
    const fromClause = filter.createdFrom ? Prisma.sql`AND o.created_at >= ${filter.createdFrom}` : Prisma.empty;
    const toClause = filter.createdTo ? Prisma.sql`AND o.created_at <= ${filter.createdTo}` : Prisma.empty;
    const searchClause = filter.buyerSearch
      ? Prisma.sql`AND (u.name ILIKE ${'%' + filter.buyerSearch + '%'} OR u.email ILIKE ${'%' + filter.buyerSearch + '%'})`
      : Prisma.empty;
    const cursorClause = filter.cursor
      ? Prisma.sql`AND (o.created_at, o.id) < (${new Date(filter.cursor.sortValue)}, ${filter.cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<StoreOrderRow[]>`
      SELECT o.id, o.order_number, o.source::text AS source, o.status::text AS status,
             u.name AS buyer_name, u.email AS buyer_email, o.total, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.buyer_id
      WHERE o.store_id = ${storeId}
      ${statusClause}
      ${sourceClause}
      ${fromClause}
      ${toClause}
      ${searchClause}
      ${cursorClause}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ${filter.limit + 1}
    `;

    const hasMore = rows.length > filter.limit;
    const kept = hasMore ? rows.slice(0, filter.limit) : rows;

    return {
      hasMore,
      items: kept.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        source: row.source,
        status: row.status,
        buyerName: row.buyer_name,
        buyerEmail: row.buyer_email,
        total: row.total.toString(),
        createdAt: row.created_at,
      })),
    };
  }
}
