import { BankAccount } from '../entities/bank-account.aggregate';

export const BANK_ACCOUNT_REPOSITORY = Symbol('BANK_ACCOUNT_REPOSITORY');

export interface BankAccountRepository {
  findById(id: string): Promise<BankAccount | null>;
  findDefaultForStore(storeId: string): Promise<BankAccount | null>;
  listByStore(storeId: string): Promise<BankAccount[]>;
  save(bankAccount: BankAccount): Promise<void>;
  // Clears every other default for the store in the same statement — the
  // partial unique index (migration 007) is the backstop, not the primary
  // guarantee, which is this being one query inside one transaction.
  clearDefaultForStore(storeId: string, exceptId?: string): Promise<void>;
  remove(id: string): Promise<void>;
}
