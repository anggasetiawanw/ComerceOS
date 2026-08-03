import { ProductRiskTier } from '../../../../shared/kernel/value-objects/product-risk-tier';
import { SettlementPolicy } from '../../../store/domain/value-objects/settlement-policy.vo';

const RISK_TIER_RANK: Readonly<Record<ProductRiskTier, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

// Reuses SettlementPolicy.effectiveHoldUntil (store module, Sprint 3) rather
// than re-deriving the platform-floor / Midtrans-settlement-clock / manual-mode
// logic here — that VO already implements exactly the rule in
// .docs/08-order-state-machine.md §4-5 and is unit-tested. A pure value
// object import across module boundaries (no infra/NestJS dependency) avoids
// duplicating money-adjacent logic that must stay in lockstep.
export class HoldingPeriodCalculator {
  compute(params: {
    riskTiers: readonly ProductRiskTier[];
    paidAt: Date;
    shippedAt?: Date | null;
    settlementPolicy: SettlementPolicy;
    sellerRequestedHold?: Date | null;
  }): Date {
    const maxRiskTier = params.riskTiers.reduce<ProductRiskTier>(
      (highest, tier) => (RISK_TIER_RANK[tier] > RISK_TIER_RANK[highest] ? tier : highest),
      'low',
    );

    return params.settlementPolicy.effectiveHoldUntil({
      paidAt: params.paidAt,
      riskTier: maxRiskTier,
      shippedAt: params.shippedAt,
      sellerRequestedHold: params.sellerRequestedHold,
    });
  }
}
