import { Withdrawal } from '../entities/withdrawal.aggregate';

export const WITHDRAWAL_REPOSITORY = Symbol('WITHDRAWAL_REPOSITORY');

export interface WithdrawalRepository {
  findById(id: string): Promise<Withdrawal | null>;
  // Row-locked read for approve/reject/markPaid — mirrors
  // OrderRepository.findByIdForUpdate's precedent so two concurrent admin
  // actions on the same withdrawal serialize.
  findByIdForUpdate(id: string): Promise<Withdrawal | null>;
  save(withdrawal: Withdrawal): Promise<void>;
  // Sum of requested|approved withdrawals for a store — the "pending
  // reservation" half of withdrawable = available - SUM(pending)
  // (.docs/09-payments-ledger.md §7).
  sumPendingByStore(storeId: string): Promise<bigint>;
  existsPendingForStore(storeId: string): Promise<boolean>;
  // Guards BankAccountService.remove — a bank account referenced by a
  // requested|approved withdrawal cannot be deleted out from under it.
  existsPendingForBankAccount(bankAccountId: string): Promise<boolean>;
}
