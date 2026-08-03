import { BalanceTransaction } from '../entities/balance-transaction.entity';
import { BalanceTransactionTypeValue } from '../value-objects/balance-transaction-type.vo';

export const BALANCE_TRANSACTION_REPOSITORY = Symbol('BALANCE_TRANSACTION_REPOSITORY');

export interface BalanceTransactionRepository {
  append(entries: readonly BalanceTransaction[]): Promise<void>;
  // The replay guard: checked after the store row lock is taken, inside the
  // same transaction, alongside the partial unique index from migration 007
  // (.docs/09 §6 consumer-idempotency).
  existsFor(orderId: string, type: BalanceTransactionTypeValue): Promise<boolean>;
  sumByStore(storeId: string): Promise<{ holdingDelta: bigint; availableDelta: bigint }>;
}
