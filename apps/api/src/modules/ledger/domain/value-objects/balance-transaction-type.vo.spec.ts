import { BalanceTransactionType } from './balance-transaction-type.vo';

describe('BalanceTransactionType', () => {
  it('orderPaidHolding increases holding only', () => {
    const type = BalanceTransactionType.orderPaidHolding();
    expect(type.holdingDirection).toBe('increase');
    expect(type.availableDirection).toBe('none');
  });

  it('orderReleased moves holding to available in one entry', () => {
    const type = BalanceTransactionType.orderReleased();
    expect(type.holdingDirection).toBe('decrease');
    expect(type.availableDirection).toBe('increase');
  });

  it('withdrawalPaid decreases available only', () => {
    const type = BalanceTransactionType.withdrawalPaid();
    expect(type.holdingDirection).toBe('none');
    expect(type.availableDirection).toBe('decrease');
  });

  it('refundDebitFromHolding and refundDebitFromAvailable differ despite the same enum value', () => {
    const fromHolding = BalanceTransactionType.refundDebitFromHolding();
    const fromAvailable = BalanceTransactionType.refundDebitFromAvailable();

    expect(fromHolding.value).toBe('refund_debit');
    expect(fromAvailable.value).toBe('refund_debit');
    expect(fromHolding.holdingDirection).toBe('decrease');
    expect(fromHolding.availableDirection).toBe('none');
    expect(fromAvailable.holdingDirection).toBe('none');
    expect(fromAvailable.availableDirection).toBe('decrease');
  });

  it('reconstitute derives direction from the sign of persisted deltas', () => {
    const type = BalanceTransactionType.reconstitute('order_released', -95_000n, 95_000n);
    expect(type.holdingDirection).toBe('decrease');
    expect(type.availableDirection).toBe('increase');
  });

  it('reconstitute treats a zero delta as no movement', () => {
    const type = BalanceTransactionType.reconstitute('withdrawal_paid', 0n, -50_000n);
    expect(type.holdingDirection).toBe('none');
    expect(type.availableDirection).toBe('decrease');
  });
});
