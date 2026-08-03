import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { StoreBalance } from '../../domain/entities/store-balance.aggregate';
import { StoreBalanceRepository } from '../../domain/repositories/store-balance.repository';
import { StoreBalanceMapper, StoreBalanceRow } from './store-balance.mapper';

// The only file that writes stores.holding_balance/available_balance
// (apps/api/src/architecture.spec.ts enforces this) — mirrors
// modules/ordering/infrastructure/persistence/order.prisma.repository.ts's
// findByIdForUpdate row-lock pattern.
@Injectable()
export class StoreBalancePrismaRepository implements StoreBalanceRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findForUpdate(storeId: string): Promise<StoreBalance | null> {
    const rows = await this.transactionManager.client.$queryRaw<StoreBalanceRow[]>`
      SELECT id, holding_balance, available_balance FROM stores WHERE id = ${storeId} FOR UPDATE
    `;
    if (rows.length === 0) return null;
    return StoreBalanceMapper.toDomain(rows[0]!);
  }

  async save(balance: StoreBalance): Promise<void> {
    await this.transactionManager.client.store.update({
      where: { id: balance.id },
      data: {
        holdingBalance: balance.holding.amount,
        availableBalance: balance.available.amount,
      },
    });
  }
}
