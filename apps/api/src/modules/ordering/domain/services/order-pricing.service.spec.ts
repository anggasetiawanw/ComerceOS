import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { OrderPricingService } from './order-pricing.service';

const money = (amount: string) => Money.fromString(amount).unwrap();

describe('OrderPricingService', () => {
  const service = new OrderPricingService();

  it('computes subtotal, total, and fee for a single line with no discount', () => {
    const result = service.price({
      items: [{ price: money('100000'), qty: 1 }],
      feeRateBasisPoints: 500,
    }).unwrap();

    expect(result.subtotal.toString()).toBe('100000');
    expect(result.discount.amount.isZero()).toBe(true);
    expect(result.total.toString()).toBe('100000');
    expect(result.fee.amount.toString()).toBe('5000');
  });

  it('sums quantity across multiple lines', () => {
    const result = service.price({
      items: [
        { price: money('50000'), qty: 2 },
        { price: money('10000'), qty: 3 },
      ],
      feeRateBasisPoints: 500,
    }).unwrap();

    expect(result.subtotal.toString()).toBe('130000');
  });

  it('clamps a discount at the subtotal — never a negative total', () => {
    const result = service.price({
      items: [{ price: money('10000'), qty: 1 }],
      discountCode: 'BESAR100',
      discountAmount: money('999999'),
      feeRateBasisPoints: 500,
    }).unwrap();

    expect(result.discount.amount.toString()).toBe('10000');
    expect(result.total.toString()).toBe('0');
    expect(result.fee.amount.toString()).toBe('0');
  });

  it('applies a partial discount below the subtotal', () => {
    const result = service.price({
      items: [{ price: money('100000'), qty: 1 }],
      discountCode: 'DISKON10',
      discountAmount: money('10000'),
      feeRateBasisPoints: 500,
    }).unwrap();

    expect(result.total.toString()).toBe('90000');
    expect(result.discount.code).toBe('DISKON10');
  });

  it('rounds the fee half up, favoring the platform', () => {
    // 333 bps of 100 = 3.33 -> rounds to 3
    const result = service.price({
      items: [{ price: money('100'), qty: 1 }],
      feeRateBasisPoints: 333,
    }).unwrap();

    expect(result.fee.amount.toString()).toBe('3');
  });

  it('rejects a negative multiplier via an invalid qty', () => {
    const result = service.price({
      items: [{ price: money('100000'), qty: -1 }],
      feeRateBasisPoints: 500,
    });

    expect(result.isErr()).toBe(true);
  });
});
