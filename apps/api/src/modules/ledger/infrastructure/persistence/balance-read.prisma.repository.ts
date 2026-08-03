import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  BalanceReadRepository,
  BalanceTransactionRow,
  PendingReleaseRow,
} from '../../domain/repositories/balance-read.repository';

interface RawTransactionRow {
  id: string;
  type: string;
  amount: bigint;
  holding_balance_after: bigint;
  available_balance_after: bigint;
  note: string | null;
  order_id: string | null;
  created_at: Date;
}

interface RawPendingReleaseRow {
  order_id: string;
  order_number: string;
  amount: bigint;
  holding_until: Date;
}

@Injectable()
export class BalanceReadPrismaRepository implements BalanceReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTransactions(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: BalanceTransactionRow[]; hasMore: boolean }> {
    const cursorClause = params.cursor
      ? Prisma.sql`AND (created_at, id) < (${new Date(params.cursor.sortValue)}, ${params.cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawTransactionRow[]>`
      SELECT id, type, amount, holding_balance_after, available_balance_after, note, order_id, created_at
      FROM balance_transactions
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
        type: row.type,
        amount: row.amount.toString(),
        holdingBalanceAfter: row.holding_balance_after.toString(),
        availableBalanceAfter: row.available_balance_after.toString(),
        note: row.note,
        orderId: row.order_id,
        createdAt: row.created_at,
      })),
    };
  }

  // Orders currently holding for this store — the release schedule shown on
  // /dashboard/keuangan. amount is total - platform_fee_amount, matching
  // what LedgerService will credit to available on release.
  async listPendingReleases(storeId: string): Promise<PendingReleaseRow[]> {
    const rows = await this.prisma.$queryRaw<RawPendingReleaseRow[]>`
      SELECT id AS order_id, order_number, (total - platform_fee_amount) AS amount, holding_until
      FROM orders
      WHERE store_id = ${storeId} AND status = 'holding' AND holding_until IS NOT NULL
      ORDER BY holding_until ASC
      LIMIT 50
    `;

    return rows.map((row) => ({
      orderId: row.order_id,
      orderNumber: row.order_number,
      amount: row.amount.toString(),
      releasesAt: row.holding_until,
    }));
  }
}
