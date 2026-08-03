import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { AUDIT_LOG_PORT, AuditLogPort } from '../../../administration/application/ports/audit-log.port';
import { BankAccount } from '../../domain/entities/bank-account.aggregate';
import { BankAccountSnapshot, BankAccountSnapshotError } from '../../domain/value-objects/bank-account-snapshot.vo';
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { WITHDRAWAL_REPOSITORY, WithdrawalRepository } from '../../domain/repositories/withdrawal.repository';
import { BankAccountInUseError, BankAccountNotFoundError } from '../../domain/errors/ledger.errors';

type AddBankAccountError = BankAccountSnapshotError;
type BankAccountOwnershipError = BankAccountNotFoundError;
type RemoveBankAccountError = BankAccountNotFoundError | BankAccountInUseError;

@Injectable()
export class BankAccountService {
  constructor(
    @Inject(BANK_ACCOUNT_REPOSITORY) private readonly bankAccounts: BankAccountRepository,
    @Inject(WITHDRAWAL_REPOSITORY) private readonly withdrawals: WithdrawalRepository,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: AuditLogPort,
    private readonly transactionManager: TransactionManager,
  ) {}

  async list(storeId: string): Promise<BankAccount[]> {
    return this.bankAccounts.listByStore(storeId);
  }

  async add(
    storeId: string,
    actorUserId: string,
    params: { bankCode: string; accountNumber: string; accountHolderName: string; makeDefault?: boolean },
  ): Promise<Result<BankAccount, AddBankAccountError>> {
    const snapshotResult = BankAccountSnapshot.create(params);
    if (snapshotResult.isErr()) return Result.err(snapshotResult.unwrapErr());

    const existing = await this.bankAccounts.listByStore(storeId);
    const isDefault = params.makeDefault === true || existing.length === 0;
    const bankAccount = BankAccount.create({ storeId, snapshot: snapshotResult.unwrap(), isDefault });

    await this.transactionManager.runInTransaction(async () => {
      if (isDefault) {
        await this.bankAccounts.clearDefaultForStore(storeId);
      }
      await this.bankAccounts.save(bankAccount);
      await this.auditLog.record({
        actorType: 'user',
        actorId: actorUserId,
        action: 'bank_account.added',
        entityType: 'bank_account',
        entityId: bankAccount.id,
        metadata: { bankCode: bankAccount.snapshot.bankCode, isDefault },
      });
    });

    return Result.ok(bankAccount);
  }

  async setDefault(
    storeId: string,
    actorUserId: string,
    bankAccountId: string,
  ): Promise<Result<void, BankAccountOwnershipError>> {
    const bankAccount = await this.bankAccounts.findById(bankAccountId);
    if (!bankAccount || !bankAccount.belongsToStore(storeId)) {
      return Result.err(new BankAccountNotFoundError());
    }

    await this.transactionManager.runInTransaction(async () => {
      await this.bankAccounts.clearDefaultForStore(storeId, bankAccountId);
      bankAccount.markAsDefault();
      await this.bankAccounts.save(bankAccount);
      await this.auditLog.record({
        actorType: 'user',
        actorId: actorUserId,
        action: 'bank_account.default_changed',
        entityType: 'bank_account',
        entityId: bankAccount.id,
      });
    });

    return Result.ok(undefined);
  }

  async remove(
    storeId: string,
    actorUserId: string,
    bankAccountId: string,
  ): Promise<Result<void, RemoveBankAccountError>> {
    const bankAccount = await this.bankAccounts.findById(bankAccountId);
    if (!bankAccount || !bankAccount.belongsToStore(storeId)) {
      return Result.err(new BankAccountNotFoundError());
    }

    const inUse = await this.withdrawals.existsPendingForBankAccount(bankAccountId);
    if (inUse) return Result.err(new BankAccountInUseError());

    await this.bankAccounts.remove(bankAccountId);
    await this.auditLog.record({
      actorType: 'user',
      actorId: actorUserId,
      action: 'bank_account.removed',
      entityType: 'bank_account',
      entityId: bankAccountId,
    });

    return Result.ok(undefined);
  }
}
