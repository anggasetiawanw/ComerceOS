import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { Withdrawal } from '../../domain/entities/withdrawal.aggregate';
import { WithdrawalRepository } from '../../domain/repositories/withdrawal.repository';
import { WithdrawalMapper } from './withdrawal.mapper';

const PENDING_STATUSES = ['requested', 'approved'] as const;

@Injectable()
export class WithdrawalPrismaRepository implements WithdrawalRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: string): Promise<Withdrawal | null> {
    const row = await this.transactionManager.client.withdrawal.findUnique({ where: { id } });
    return row ? WithdrawalMapper.toDomain(row) : null;
  }

  async findByIdForUpdate(id: string): Promise<Withdrawal | null> {
    const locked = await this.transactionManager.client.$queryRaw<{ id: string }[]>`
      SELECT id FROM withdrawals WHERE id = ${id} FOR UPDATE
    `;
    if (locked.length === 0) return null;
    return this.findById(id);
  }

  async save(withdrawal: Withdrawal): Promise<void> {
    const data = WithdrawalMapper.toPersistence(withdrawal);
    await this.transactionManager.client.withdrawal.upsert({
      where: { id: withdrawal.id },
      create: data,
      update: {
        status: data.status,
        approvedAt: data.approvedAt,
        rejectedAt: data.rejectedAt,
        paidAt: data.paidAt,
        reviewedById: data.reviewedById,
        adminNote: data.adminNote,
      },
    });
  }

  async sumPendingByStore(storeId: string): Promise<bigint> {
    const result = await this.transactionManager.client.withdrawal.aggregate({
      where: { storeId, status: { in: [...PENDING_STATUSES] } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0n;
  }

  async existsPendingForStore(storeId: string): Promise<boolean> {
    const count = await this.transactionManager.client.withdrawal.count({
      where: { storeId, status: { in: [...PENDING_STATUSES] } },
    });
    return count > 0;
  }

  async existsPendingForBankAccount(bankAccountId: string): Promise<boolean> {
    const count = await this.transactionManager.client.withdrawal.count({
      where: { bankAccountId, status: { in: [...PENDING_STATUSES] } },
    });
    return count > 0;
  }
}
