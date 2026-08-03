import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { BankAccount } from '../../domain/entities/bank-account.aggregate';
import { BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { BankAccountMapper } from './bank-account.mapper';

@Injectable()
export class BankAccountPrismaRepository implements BankAccountRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: string): Promise<BankAccount | null> {
    const row = await this.transactionManager.client.bankAccount.findUnique({ where: { id } });
    return row ? BankAccountMapper.toDomain(row) : null;
  }

  async findDefaultForStore(storeId: string): Promise<BankAccount | null> {
    const row = await this.transactionManager.client.bankAccount.findFirst({
      where: { storeId, isDefault: true },
    });
    return row ? BankAccountMapper.toDomain(row) : null;
  }

  async listByStore(storeId: string): Promise<BankAccount[]> {
    const rows = await this.transactionManager.client.bankAccount.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => BankAccountMapper.toDomain(row));
  }

  async save(bankAccount: BankAccount): Promise<void> {
    const data = BankAccountMapper.toPersistence(bankAccount);
    await this.transactionManager.client.bankAccount.upsert({
      where: { id: bankAccount.id },
      create: data,
      update: {
        bankCode: data.bankCode,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        isDefault: data.isDefault,
        verifiedAt: data.verifiedAt,
      },
    });
  }

  async clearDefaultForStore(storeId: string, exceptId?: string): Promise<void> {
    await this.transactionManager.client.bankAccount.updateMany({
      where: { storeId, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false },
    });
  }

  async remove(id: string): Promise<void> {
    await this.transactionManager.client.bankAccount.delete({ where: { id } });
  }
}
