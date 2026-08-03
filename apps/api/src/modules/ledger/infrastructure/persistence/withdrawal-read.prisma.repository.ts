import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  AdminWithdrawalRow,
  WithdrawalReadRepository,
  WithdrawalRow,
} from '../../domain/repositories/withdrawal-read.repository';

interface RawWithdrawalRow {
  id: string;
  store_id: string;
  amount: bigint;
  status: string;
  bank_account_snapshot: Prisma.JsonValue;
  requested_at: Date;
  approved_at: Date | null;
  rejected_at: Date | null;
  paid_at: Date | null;
  admin_note: string | null;
}

interface RawAdminWithdrawalRow extends RawWithdrawalRow {
  store_username: string;
  store_display_name: string;
}

interface BankAccountSnapshotFields {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

const isSnapshotFields = (value: unknown): value is BankAccountSnapshotFields =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).bankCode === 'string' &&
  typeof (value as Record<string, unknown>).bankName === 'string' &&
  typeof (value as Record<string, unknown>).accountNumber === 'string' &&
  typeof (value as Record<string, unknown>).accountHolderName === 'string';

const snapshotFields = (snapshot: Prisma.JsonValue): BankAccountSnapshotFields => {
  if (!isSnapshotFields(snapshot)) {
    throw new Error('Corrupt withdrawals row: invalid bank_account_snapshot');
  }
  return snapshot;
};

const toRow = (row: RawWithdrawalRow): WithdrawalRow => ({
  id: row.id,
  storeId: row.store_id,
  amount: row.amount.toString(),
  status: row.status,
  ...snapshotFields(row.bank_account_snapshot),
  requestedAt: row.requested_at,
  approvedAt: row.approved_at,
  rejectedAt: row.rejected_at,
  paidAt: row.paid_at,
  adminNote: row.admin_note,
});

@Injectable()
export class WithdrawalReadPrismaRepository implements WithdrawalReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByStore(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: WithdrawalRow[]; hasMore: boolean }> {
    const cursorClause = params.cursor
      ? Prisma.sql`AND (requested_at, id) < (${new Date(params.cursor.sortValue)}, ${params.cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawWithdrawalRow[]>`
      SELECT id, store_id, amount, status, bank_account_snapshot, requested_at, approved_at, rejected_at, paid_at, admin_note
      FROM withdrawals
      WHERE store_id = ${params.storeId}
      ${cursorClause}
      ORDER BY requested_at DESC, id DESC
      LIMIT ${params.limit + 1}
    `;

    const hasMore = rows.length > params.limit;
    const kept = hasMore ? rows.slice(0, params.limit) : rows;
    return { hasMore, rows: kept.map(toRow) };
  }

  async listForAdmin(params: {
    status?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AdminWithdrawalRow[]; hasMore: boolean }> {
    // w.status is a native Postgres enum (WithdrawalStatus); Prisma's
    // $queryRaw binds a plain string parameter as text, which Postgres
    // won't implicitly compare against an enum — cast the column instead
    // of the parameter so an unrecognized status still 400s via the DTO's
    // @IsIn rather than silently matching nothing.
    const statusClause = params.status ? Prisma.sql`AND w.status::text = ${params.status}` : Prisma.empty;
    const cursorClause = params.cursor
      ? Prisma.sql`AND (w.requested_at, w.id) < (${new Date(params.cursor.sortValue)}, ${params.cursor.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawAdminWithdrawalRow[]>`
      SELECT w.id, w.store_id, w.amount, w.status, w.bank_account_snapshot, w.requested_at, w.approved_at,
             w.rejected_at, w.paid_at, w.admin_note, s.username AS store_username, s.display_name AS store_display_name
      FROM withdrawals w
      JOIN stores s ON s.id = w.store_id
      WHERE 1 = 1
      ${statusClause}
      ${cursorClause}
      ORDER BY w.requested_at DESC, w.id DESC
      LIMIT ${params.limit + 1}
    `;

    const hasMore = rows.length > params.limit;
    const kept = hasMore ? rows.slice(0, params.limit) : rows;
    return {
      hasMore,
      rows: kept.map((row) => ({
        ...toRow(row),
        storeUsername: row.store_username,
        storeDisplayName: row.store_display_name,
      })),
    };
  }
}
