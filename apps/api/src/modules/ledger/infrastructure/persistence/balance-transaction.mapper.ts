import { Prisma, BalanceTransaction as PrismaBalanceTransaction } from '@prisma/client';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { BalanceTransaction } from '../../domain/entities/balance-transaction.entity';
import { BalanceSnapshot } from '../../domain/value-objects/balance-snapshot.vo';
import { BalanceDirection, BalanceTransactionType } from '../../domain/value-objects/balance-transaction-type.vo';

const deltaFor = (direction: BalanceDirection, amount: bigint): bigint => {
  if (direction === 'increase') return amount;
  if (direction === 'decrease') return -amount;
  return 0n;
};

export class BalanceTransactionMapper {
  static toDomain(row: PrismaBalanceTransaction): BalanceTransaction {
    const amountResult = Money.fromRupiah(row.amount);
    if (amountResult.isErr()) {
      throw new Error(`Corrupt balance_transactions row: invalid amount for row "${row.id}"`);
    }
    const holdingAfterResult = Money.fromRupiah(row.holdingBalanceAfter);
    if (holdingAfterResult.isErr()) {
      throw new Error(`Corrupt balance_transactions row: invalid holding_balance_after for row "${row.id}"`);
    }
    const availableAfterResult = Money.fromRupiah(row.availableBalanceAfter);
    if (availableAfterResult.isErr()) {
      throw new Error(`Corrupt balance_transactions row: invalid available_balance_after for row "${row.id}"`);
    }

    return BalanceTransaction.reconstitute(
      {
        storeId: row.storeId,
        orderId: row.orderId,
        withdrawalId: row.withdrawalId,
        type: BalanceTransactionType.reconstitute(row.type, row.holdingDelta, row.availableDelta),
        amount: amountResult.unwrap(),
        snapshot: BalanceSnapshot.of(holdingAfterResult.unwrap(), availableAfterResult.unwrap()),
        note: row.note,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistence(entry: BalanceTransaction): Prisma.BalanceTransactionUncheckedCreateInput {
    return {
      id: entry.id,
      storeId: entry.storeId,
      orderId: entry.orderId,
      withdrawalId: entry.withdrawalId,
      type: entry.type.value,
      amount: entry.amount.amount,
      holdingDelta: deltaFor(entry.type.holdingDirection, entry.amount.amount),
      availableDelta: deltaFor(entry.type.availableDirection, entry.amount.amount),
      holdingBalanceAfter: entry.snapshot.holding.amount,
      availableBalanceAfter: entry.snapshot.available.amount,
      note: entry.note,
      createdAt: entry.createdAt,
    };
  }
}
