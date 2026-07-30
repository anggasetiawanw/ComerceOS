import { StorePlan } from './store-plan.vo';

describe('StorePlan', () => {
  it('creates from a valid value', () => {
    expect(StorePlan.create('free').isOk()).toBe(true);
    expect(StorePlan.create('pro').isOk()).toBe(true);
  });

  it('rejects an invalid value', () => {
    const result = StorePlan.create('enterprise');
    expect(result.isErr()).toBe(true);
  });

  it('free() seeds the free plan', () => {
    expect(StorePlan.free().value).toBe('free');
    expect(StorePlan.free().isPro()).toBe(false);
  });

  it('computes basis points from injected rates', () => {
    const rates = { free: 0.05, pro: 0.025 };
    expect(StorePlan.create('free').unwrap().feeRateBasisPoints(rates)).toBe(500);
    expect(StorePlan.create('pro').unwrap().feeRateBasisPoints(rates)).toBe(250);
  });
});
