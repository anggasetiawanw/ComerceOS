import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { BalanceTransaction } from '../../domain/entities/balance-transaction.entity';
import { BalanceTransactionRepository } from '../../domain/repositories/balance-transaction.repository';
import { BalanceTransactionTypeValue } from '../../domain/value-objects/balance-transaction-type.vo';
import { BalanceTransactionMapper } from './balance-transaction.mapper';

@Injectable()
export class BalanceTransactionPrismaRepository implements BalanceTransactionRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async append(entries: readonly BalanceTransaction[]): Promise<void> {
    if (entries.length === 0) return;
    await this.transactionManager.client.balanceTransaction.createMany({
      data: entries.map((entry) => BalanceTransactionMapper.toPersistence(entry)),
    });
  }

  async existsFor(orderId: string, type: BalanceTransactionTypeValue): Promise<boolean> {
    const count = await this.transactionManager.client.balanceTransaction.count({
      where: { orderId, type },
    });
    return count > 0;
  }

  async sumByStore(storeId: string): Promise<{ holdingDelta: bigint; availableDelta: bigint }> {
    const result = await this.transactionManager.client.balanceTransaction.aggregate({
      where: { storeId },
      _sum: { holdingDelta: true, availableDelta: true },
    });
    return {
      holdingDelta: result._sum.holdingDelta ?? 0n,
      availableDelta: result._sum.availableDelta ?? 0n,
    };
  }
}
