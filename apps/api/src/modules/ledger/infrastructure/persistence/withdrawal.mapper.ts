import { Prisma, Withdrawal as PrismaWithdrawal } from '@prisma/client';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { Withdrawal } from '../../domain/entities/withdrawal.aggregate';
import { BankAccountSnapshot } from '../../domain/value-objects/bank-account-snapshot.vo';
import { WithdrawalStatus } from '../../domain/value-objects/withdrawal-status.vo';

interface BankAccountSnapshotJson {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

const isSnapshotJson = (value: unknown): value is BankAccountSnapshotJson =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).bankCode === 'string' &&
  typeof (value as Record<string, unknown>).bankName === 'string' &&
  typeof (value as Record<string, unknown>).accountNumber === 'string' &&
  typeof (value as Record<string, unknown>).accountHolderName === 'string';

export class WithdrawalMapper {
  static toDomain(row: PrismaWithdrawal): Withdrawal {
    const amountResult = Money.fromRupiah(row.amount);
    if (amountResult.isErr()) {
      throw new Error(`Corrupt withdrawals row: invalid amount for row "${row.id}"`);
    }

    const snapshotJson = row.bankAccountSnapshot;
    if (!isSnapshotJson(snapshotJson)) {
      throw new Error(`Corrupt withdrawals row: invalid bank_account_snapshot for row "${row.id}"`);
    }

    const statusResult = WithdrawalStatus.create(row.status);
    if (statusResult.isErr()) {
      throw new Error(`Corrupt withdrawals row: invalid status for row "${row.id}"`);
    }

    return Withdrawal.reconstitute(
      {
        storeId: row.storeId,
        bankAccountId: row.bankAccountId,
        amount: amountResult.unwrap(),
        status: statusResult.unwrap(),
        snapshot: BankAccountSnapshot.reconstitute(snapshotJson),
        requestedAt: row.requestedAt,
        approvedAt: row.approvedAt,
        rejectedAt: row.rejectedAt,
        paidAt: row.paidAt,
        reviewedById: row.reviewedById,
        adminNote: row.adminNote,
      },
      row.id,
    );
  }

  static toPersistence(withdrawal: Withdrawal): Prisma.WithdrawalUncheckedCreateInput {
    return {
      id: withdrawal.id,
      storeId: withdrawal.storeId,
      bankAccountId: withdrawal.bankAccountId,
      amount: withdrawal.amount.amount,
      status: withdrawal.status.value,
      // Json-boundary cast — same precedent as
      // notification-delivery.mapper.ts/invoice.mapper.ts.
      bankAccountSnapshot: withdrawal.snapshot.toJSON() as unknown as Prisma.InputJsonValue,
      requestedAt: withdrawal.requestedAt,
      approvedAt: withdrawal.approvedAt,
      rejectedAt: withdrawal.rejectedAt,
      paidAt: withdrawal.paidAt,
      reviewedById: withdrawal.reviewedById,
      adminNote: withdrawal.adminNote,
    };
  }
}
