import { SettlementMode } from './settlement-mode.vo';
import { PlatformFloorConfig, SettlementPolicy } from './settlement-policy.vo';

const CONFIG: PlatformFloorConfig = {
  holdingDaysByTier: { low: 0, medium: 3, high: 7 },
  midtransSettlementDays: 3,
  autoForceReleaseDays: 30,
};

const PAID_AT = new Date('2026-01-01T00:00:00.000Z');

describe('SettlementPolicy', () => {
  it('auto + low returns the Midtrans floor, not paidAt', () => {
    const policy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const result = policy.effectiveHoldUntil({ paidAt: PAID_AT, riskTier: 'low' });
    expect(result).toEqual(new Date('2026-01-04T00:00:00.000Z'));
  });

  it('auto + medium without shippedAt counts from paidAt', () => {
    const policy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const result = policy.effectiveHoldUntil({ paidAt: PAID_AT, riskTier: 'medium' });
    expect(result).toEqual(new Date('2026-01-04T00:00:00.000Z'));
  });

  it('auto + medium with a later shippedAt counts from shippedAt', () => {
    const policy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const shippedAt = new Date('2026-01-10T00:00:00.000Z');
    const result = policy.effectiveHoldUntil({ paidAt: PAID_AT, riskTier: 'medium', shippedAt });
    expect(result).toEqual(new Date('2026-01-13T00:00:00.000Z'));
  });

  it('auto + high returns paidAt+7 because it beats the Midtrans clock', () => {
    const policy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const result = policy.effectiveHoldUntil({ paidAt: PAID_AT, riskTier: 'high' });
    expect(result).toEqual(new Date('2026-01-08T00:00:00.000Z'));
  });

  it('manual with a seller hold before the floor returns the floor (never shortens)', () => {
    const policy = SettlementPolicy.create(SettlementMode.manual(), CONFIG);
    const sellerRequestedHold = new Date('2026-01-02T00:00:00.000Z');
    const result = policy.effectiveHoldUntil({
      paidAt: PAID_AT,
      riskTier: 'low',
      sellerRequestedHold,
    });
    expect(result).toEqual(new Date('2026-01-04T00:00:00.000Z'));
  });

  it('manual with a seller hold after the floor returns the seller date', () => {
    const policy = SettlementPolicy.create(SettlementMode.manual(), CONFIG);
    const sellerRequestedHold = new Date('2026-02-01T00:00:00.000Z');
    const result = policy.effectiveHoldUntil({
      paidAt: PAID_AT,
      riskTier: 'low',
      sellerRequestedHold,
    });
    expect(result).toEqual(sellerRequestedHold);
  });

  it('auto ignores sellerRequestedHold entirely', () => {
    const policy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const sellerRequestedHold = new Date('2026-06-01T00:00:00.000Z');
    const result = policy.effectiveHoldUntil({
      paidAt: PAID_AT,
      riskTier: 'low',
      sellerRequestedHold,
    });
    expect(result).toEqual(new Date('2026-01-04T00:00:00.000Z'));
  });

  it('forcedReleaseAt is paidAt+30 in both modes', () => {
    const autoPolicy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const manualPolicy = SettlementPolicy.create(SettlementMode.manual(), CONFIG);
    const expected = new Date('2026-01-31T00:00:00.000Z');
    expect(autoPolicy.forcedReleaseAt(PAID_AT)).toEqual(expected);
    expect(manualPolicy.forcedReleaseAt(PAID_AT)).toEqual(expected);
  });

  it('never returns a date before paidAt', () => {
    const policy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
    const result = policy.effectiveHoldUntil({ paidAt: PAID_AT, riskTier: 'low' });
    expect(result.getTime()).toBeGreaterThanOrEqual(PAID_AT.getTime());
  });
});
