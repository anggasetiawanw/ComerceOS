import { StoreBalance } from '../entities/store-balance.aggregate';

export const STORE_BALANCE_REPOSITORY = Symbol('STORE_BALANCE_REPOSITORY');

export interface StoreBalanceRepository {
  // SELECT ... FOR UPDATE on the stores row — the concurrency boundary.
  // Only ever meaningful inside TransactionManager.runInTransaction; called
  // from nowhere but LedgerService (.docs/09-payments-ledger.md §4).
  findForUpdate(storeId: string): Promise<StoreBalance | null>;
  save(balance: StoreBalance): Promise<void>;
}
