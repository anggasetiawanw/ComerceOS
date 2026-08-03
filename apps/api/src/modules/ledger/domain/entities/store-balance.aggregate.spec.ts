import { StoreBalance } from './store-balance.aggregate';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { InsufficientHoldingBalanceError } from '../errors/ledger.errors';

const money = (amount: number): Money => Money.fromRupiah(amount).unwrap();

const freshBalance = (): StoreBalance =>
  StoreBalance.reconstitute({ storeId: 'store-1', holding: Money.zero(), available: Money.zero() });

describe('StoreBalance', () => {
  it('creditHolding then releaseToAvailable produces 95000/0 then 0/95000', () => {
    const balance = freshBalance();

    balance.creditHolding({ orderId: 'order-1', amount: money(95_000) });
    expect(balance.holding.amount).toBe(95_000n);
    expect(balance.available.amount).toBe(0n);

    const released = balance.releaseToAvailable({ orderId: 'order-1', amount: money(95_000) });
    expect(released.isOk()).toBe(true);
    expect(balance.holding.amount).toBe(0n);
    expect(balance.available.amount).toBe(95_000n);
  });

  it('rejects releasing more than the current holding balance', () => {
    const balance = freshBalance();
    balance.creditHolding({ orderId: 'order-1', amount: money(50_000) });

    const result = balance.releaseToAvailable({ orderId: 'order-1', amount: money(60_000) });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBeInstanceOf(InsufficientHoldingBalanceError);
  });

  it('leaves holding and available unchanged after a failed release (no partial mutation)', () => {
    const balance = freshBalance();
    balance.creditHolding({ orderId: 'order-1', amount: money(50_000) });
    balance.pullPendingEntries();

    balance.releaseToAvailable({ orderId: 'order-1', amount: money(60_000) });

    expect(balance.holding.amount).toBe(50_000n);
    expect(balance.available.amount).toBe(0n);
  });

  it('appends exactly one entry per mutation, snapshotting the post-state', () => {
    const balance = freshBalance();

    balance.creditHolding({ orderId: 'order-1', amount: money(95_000) });
    const afterCredit = balance.pullPendingEntries();
    expect(afterCredit).toHaveLength(1);
    expect(afterCredit[0]!.snapshot.holding.amount).toBe(95_000n);
    expect(afterCredit[0]!.snapshot.available.amount).toBe(0n);
    expect(afterCredit[0]!.type.value).toBe('order_paid_holding');

    balance.releaseToAvailable({ orderId: 'order-1', amount: money(95_000) });
    const afterRelease = balance.pullPendingEntries();
    expect(afterRelease).toHaveLength(1);
    expect(afterRelease[0]!.snapshot.holding.amount).toBe(0n);
    expect(afterRelease[0]!.snapshot.available.amount).toBe(95_000n);
    expect(afterRelease[0]!.type.value).toBe('order_released');
  });

  it('pullPendingEntries drains the buffer', () => {
    const balance = freshBalance();
    balance.creditHolding({ orderId: 'order-1', amount: money(10_000) });

    expect(balance.pullPendingEntries()).toHaveLength(1);
    expect(balance.pullPendingEntries()).toHaveLength(0);
  });

  it('the aggregate id equals the store id', () => {
    const balance = freshBalance();
    expect(balance.id).toBe('store-1');
  });
});
