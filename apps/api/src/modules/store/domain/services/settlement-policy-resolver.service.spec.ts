import { SettlementMode } from '../value-objects/settlement-mode.vo';
import { PlatformFloorConfig } from '../value-objects/settlement-policy.vo';
import { SettlementPolicyResolver } from './settlement-policy-resolver.service';

describe('SettlementPolicyResolver', () => {
  it('resolves the store mode plus injected config into a SettlementPolicy', () => {
    const config: PlatformFloorConfig = {
      holdingDaysByTier: { low: 0, medium: 3, high: 7 },
      midtransSettlementDays: 3,
      autoForceReleaseDays: 30,
    };
    const resolver = new SettlementPolicyResolver(config);

    const policy = resolver.resolve(SettlementMode.manual());

    expect(policy.mode).toBe('manual');
  });

  it('different injected configs produce different floors for the same mode', () => {
    const shortConfig: PlatformFloorConfig = {
      holdingDaysByTier: { low: 0, medium: 1, high: 2 },
      midtransSettlementDays: 1,
      autoForceReleaseDays: 30,
    };
    const longConfig: PlatformFloorConfig = {
      holdingDaysByTier: { low: 5, medium: 5, high: 5 },
      midtransSettlementDays: 5,
      autoForceReleaseDays: 30,
    };
    const paidAt = new Date('2026-01-01T00:00:00.000Z');

    const shortPolicy = new SettlementPolicyResolver(shortConfig).resolve(SettlementMode.auto());
    const longPolicy = new SettlementPolicyResolver(longConfig).resolve(SettlementMode.auto());

    const shortResult = shortPolicy.effectiveHoldUntil({ paidAt, riskTier: 'low' });
    const longResult = longPolicy.effectiveHoldUntil({ paidAt, riskTier: 'low' });

    expect(longResult.getTime()).toBeGreaterThan(shortResult.getTime());
  });
});
