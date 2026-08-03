import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { BalanceTransaction } from './balance-transaction.entity';
import { BalanceSnapshot } from '../value-objects/balance-snapshot.vo';
import { BalanceTransactionType } from '../value-objects/balance-transaction-type.vo';
import { BalanceCreditedEvent } from '../events/balance-credited.event';
import { BalanceReleasedEvent } from '../events/balance-released.event';
import { InsufficientHoldingBalanceError } from '../errors/ledger.errors';

export interface StoreBalanceProps {
  storeId: string;
  holding: Money;
  available: Money;
}

// One aggregate per store — the concurrency boundary. Its id IS the store
// id (see reconstitute), loaded under `SELECT ... FOR UPDATE` by
// StoreBalanceRepository.findForUpdate so two concurrent mutations for the
// same store serialize (.docs/04-entity-design.md §6).
//
// Every mutation follows the same order: compute the new balances via
// Money.add/subtract, return early on any Err (mutating nothing), then
// assign the new balances and append exactly one BalanceTransaction
// carrying the resulting snapshot in the same step — there is no code path
// that changes a balance without producing the row.
export class StoreBalance extends AggregateRoot<StoreBalanceProps> {
  private pendingEntries: BalanceTransaction[] = [];

  private constructor(props: StoreBalanceProps, id: UniqueId) {
    super(props, id);
  }

  static reconstitute(props: { storeId: string; holding: Money; available: Money }): StoreBalance {
    return new StoreBalance({ storeId: props.storeId, holding: props.holding, available: props.available }, props.storeId);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get holding(): Money {
    return this.props.holding;
  }

  get available(): Money {
    return this.props.available;
  }

  creditHolding(params: { orderId: string; amount: Money; note?: string }): BalanceTransaction {
    const newHolding = this.props.holding.add(params.amount);
    this.props.holding = newHolding;

    const entry = BalanceTransaction.record({
      storeId: this.props.storeId,
      orderId: params.orderId,
      type: BalanceTransactionType.orderPaidHolding(),
      amount: params.amount,
      snapshot: BalanceSnapshot.of(newHolding, this.props.available),
      note: params.note,
    });
    this.pendingEntries.push(entry);
    this.addDomainEvent(new BalanceCreditedEvent(this.props.storeId, params.orderId, params.amount.toString()));
    return entry;
  }

  releaseToAvailable(params: { orderId: string; amount: Money }): Result<BalanceTransaction, InsufficientHoldingBalanceError> {
    const holdingResult = this.props.holding.subtract(params.amount);
    if (holdingResult.isErr()) {
      return Result.err(new InsufficientHoldingBalanceError());
    }

    const newHolding = holdingResult.unwrap();
    const newAvailable = this.props.available.add(params.amount);
    this.props.holding = newHolding;
    this.props.available = newAvailable;

    const entry = BalanceTransaction.record({
      storeId: this.props.storeId,
      orderId: params.orderId,
      type: BalanceTransactionType.orderReleased(),
      amount: params.amount,
      snapshot: BalanceSnapshot.of(newHolding, newAvailable),
    });
    this.pendingEntries.push(entry);
    this.addDomainEvent(new BalanceReleasedEvent(this.props.storeId, params.orderId, params.amount.toString()));
    return Result.ok(entry);
  }

  pullPendingEntries(): BalanceTransaction[] {
    const entries = this.pendingEntries;
    this.pendingEntries = [];
    return entries;
  }
}
