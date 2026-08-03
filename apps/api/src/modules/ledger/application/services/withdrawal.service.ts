import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { OrderReadService } from '../../../ordering/application/services/order-read.service';
import { AUDIT_LOG_PORT, AuditLogPort } from '../../../administration/application/ports/audit-log.port';
import { Withdrawal } from '../../domain/entities/withdrawal.aggregate';
import { WITHDRAWAL_REPOSITORY, WithdrawalRepository } from '../../domain/repositories/withdrawal.repository';
import { BANK_ACCOUNT_REPOSITORY, BankAccountRepository } from '../../domain/repositories/bank-account.repository';
import { STORE_BALANCE_REPOSITORY, StoreBalanceRepository } from '../../domain/repositories/store-balance.repository';
import { BALANCE_TRANSACTION_REPOSITORY, BalanceTransactionRepository } from '../../domain/repositories/balance-transaction.repository';
import {
  BelowMinimumWithdrawalError,
  IllegalWithdrawalTransitionError,
  InsufficientAvailableBalanceError,
  InsufficientWithdrawableBalanceError,
  NoDefaultBankAccountError,
  PendingWithdrawalExistsError,
  StoreBalanceNotFoundError,
  StoreHasDisputedOrderError,
  WithdrawalNotFoundError,
} from '../../domain/errors/ledger.errors';

export type RequestWithdrawalError =
  | StoreBalanceNotFoundError
  | BelowMinimumWithdrawalError
  | InsufficientWithdrawableBalanceError
  | NoDefaultBankAccountError
  | PendingWithdrawalExistsError
  | StoreHasDisputedOrderError;

export type ReviewWithdrawalError = WithdrawalNotFoundError | IllegalWithdrawalTransitionError;
export type MarkPaidError = WithdrawalNotFoundError | IllegalWithdrawalTransitionError | StoreBalanceNotFoundError | InsufficientAvailableBalanceError;

// Every mutating method is one transaction, store-row-locked first
// (.docs/09-payments-ledger.md §7 — "both reads happen under the same row
// lock, so a seller cannot open two tabs and request the same money
// twice"). The debit itself only happens in markPaid, matching "why the
// debit happens at mark-paid, not at request".
@Injectable()
export class WithdrawalService {
  constructor(
    @Inject(WITHDRAWAL_REPOSITORY) private readonly withdrawals: WithdrawalRepository,
    @Inject(BANK_ACCOUNT_REPOSITORY) private readonly bankAccounts: BankAccountRepository,
    @Inject(STORE_BALANCE_REPOSITORY) private readonly balances: StoreBalanceRepository,
    @Inject(BALANCE_TRANSACTION_REPOSITORY) private readonly balanceTransactions: BalanceTransactionRepository,
    private readonly orderReads: OrderReadService,
    private readonly config: AppConfigService,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: AuditLogPort,
  ) {}

  async request(
    storeId: string,
    actorUserId: string,
    amountRupiah: bigint,
  ): Promise<Result<Withdrawal, RequestWithdrawalError>> {
    return this.transactionManager.runInTransaction(async () => {
      // Lock first — the balance read, the pending-withdrawal check, and the
      // withdrawable computation must all see a consistent snapshot.
      const balance = await this.balances.findForUpdate(storeId);
      if (!balance) return Result.err(new StoreBalanceNotFoundError());

      const amount = Money.fromRupiah(amountRupiah).unwrap();
      const minimum = Money.fromRupiah(BigInt(this.config.withdrawalMinAmount)).unwrap();
      if (amount.isLessThan(minimum)) {
        return Result.err(new BelowMinimumWithdrawalError(minimum.toString()));
      }

      const pendingExists = await this.withdrawals.existsPendingForStore(storeId);
      if (pendingExists) return Result.err(new PendingWithdrawalExistsError());

      const pendingSum = await this.withdrawals.sumPendingByStore(storeId);
      const pendingMoney = Money.fromRupiah(pendingSum).unwrap();
      const withdrawableResult = balance.available.subtract(pendingMoney);
      const withdrawable = withdrawableResult.isErr() ? Money.zero() : withdrawableResult.unwrap();
      if (amount.isGreaterThan(withdrawable)) {
        return Result.err(new InsufficientWithdrawableBalanceError());
      }

      const defaultAccount = await this.bankAccounts.findDefaultForStore(storeId);
      if (!defaultAccount) return Result.err(new NoDefaultBankAccountError());

      const hasDispute = await this.orderReads.hasDisputedOrder(storeId);
      if (hasDispute) return Result.err(new StoreHasDisputedOrderError());

      const withdrawal = Withdrawal.request({
        storeId,
        bankAccountId: defaultAccount.id,
        amount,
        snapshot: defaultAccount.snapshot,
      });

      await this.withdrawals.save(withdrawal);
      await this.outbox.enqueueAll(withdrawal.pullDomainEvents());
      await this.auditLog.record({
        actorType: 'user',
        actorId: actorUserId,
        action: 'withdrawal.requested',
        entityType: 'withdrawal',
        entityId: withdrawal.id,
        metadata: { amount: amount.toString() },
      });

      return Result.ok(withdrawal);
    });
  }

  async approve(withdrawalId: string, adminUserId: string): Promise<Result<Withdrawal, ReviewWithdrawalError>> {
    return this.transactionManager.runInTransaction(async () => {
      const withdrawal = await this.withdrawals.findByIdForUpdate(withdrawalId);
      if (!withdrawal) return Result.err(new WithdrawalNotFoundError());

      const result = withdrawal.approve(adminUserId);
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.withdrawals.save(withdrawal);
      await this.auditLog.record({
        actorType: 'admin',
        actorId: adminUserId,
        action: 'withdrawal.approved',
        entityType: 'withdrawal',
        entityId: withdrawal.id,
      });

      return Result.ok(withdrawal);
    });
  }

  async reject(
    withdrawalId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<Result<Withdrawal, ReviewWithdrawalError>> {
    return this.transactionManager.runInTransaction(async () => {
      const withdrawal = await this.withdrawals.findByIdForUpdate(withdrawalId);
      if (!withdrawal) return Result.err(new WithdrawalNotFoundError());

      const result = withdrawal.reject(adminUserId, reason);
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.withdrawals.save(withdrawal);
      await this.outbox.enqueueAll(withdrawal.pullDomainEvents());
      await this.auditLog.record({
        actorType: 'admin',
        actorId: adminUserId,
        action: 'withdrawal.rejected',
        entityType: 'withdrawal',
        entityId: withdrawal.id,
        metadata: { reason: reason ?? null },
      });

      return Result.ok(withdrawal);
    });
  }

  async markPaid(withdrawalId: string, adminUserId: string): Promise<Result<Withdrawal, MarkPaidError>> {
    return this.transactionManager.runInTransaction(async () => {
      const withdrawal = await this.withdrawals.findByIdForUpdate(withdrawalId);
      if (!withdrawal) return Result.err(new WithdrawalNotFoundError());

      // Status transition is the replay guard: approved -> paid is legal
      // exactly once, so a second markPaid call on an already-paid
      // withdrawal fails here before any balance is touched. The migration's
      // partial unique index on (withdrawal_id, type) is the DB-level
      // backstop behind this, not a second application-level check.
      const transitionResult = withdrawal.markPaid(adminUserId);
      if (transitionResult.isErr()) return Result.err(transitionResult.unwrapErr());

      const balance = await this.balances.findForUpdate(withdrawal.storeId);
      if (!balance) return Result.err(new StoreBalanceNotFoundError());

      const debitResult = balance.debitForWithdrawal({ withdrawalId: withdrawal.id, amount: withdrawal.amount });
      if (debitResult.isErr()) return Result.err(debitResult.unwrapErr());

      await this.balances.save(balance);
      await this.balanceTransactions.append(balance.pullPendingEntries());
      await this.withdrawals.save(withdrawal);
      await this.outbox.enqueueAll(withdrawal.pullDomainEvents());
      await this.auditLog.record({
        actorType: 'admin',
        actorId: adminUserId,
        action: 'withdrawal.paid',
        entityType: 'withdrawal',
        entityId: withdrawal.id,
        metadata: { amount: withdrawal.amount.toString() },
      });

      return Result.ok(withdrawal);
    });
  }
}
