import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { BalanceTransactionType } from '../value-objects/balance-transaction-type.vo';
import { BalanceSnapshot } from '../value-objects/balance-snapshot.vo';

export interface BalanceTransactionProps {
  storeId: string;
  orderId: string | null;
  withdrawalId: string | null;
  type: BalanceTransactionType;
  amount: Money;
  snapshot: BalanceSnapshot;
  note: string | null;
  createdAt: Date;
}

// Append-only: no method here mutates a persisted row, and nothing may
// UPDATE or DELETE one (.docs/09-payments-ledger.md §4).
export class BalanceTransaction extends Entity<BalanceTransactionProps> {
  private constructor(props: BalanceTransactionProps, id?: UniqueId) {
    super(props, id);
  }

  // @internal — only StoreBalance may construct one (enforced by
  // apps/api/src/architecture.spec.ts, since TypeScript itself cannot
  // express "private to one other module's class").
  static record(params: {
    storeId: string;
    orderId?: string | null;
    withdrawalId?: string | null;
    type: BalanceTransactionType;
    amount: Money;
    snapshot: BalanceSnapshot;
    note?: string | null;
  }): BalanceTransaction {
    return new BalanceTransaction({
      storeId: params.storeId,
      orderId: params.orderId ?? null,
      withdrawalId: params.withdrawalId ?? null,
      type: params.type,
      amount: params.amount,
      snapshot: params.snapshot,
      note: params.note ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: BalanceTransactionProps, id: UniqueId): BalanceTransaction {
    return new BalanceTransaction(props, id);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get orderId(): string | null {
    return this.props.orderId;
  }

  get withdrawalId(): string | null {
    return this.props.withdrawalId;
  }

  get type(): BalanceTransactionType {
    return this.props.type;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get snapshot(): BalanceSnapshot {
    return this.props.snapshot;
  }

  get note(): string | null {
    return this.props.note;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
