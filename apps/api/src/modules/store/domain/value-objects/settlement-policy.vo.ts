import { addDays, max as maxDate } from 'date-fns';
import { ValueObject } from '../../../../shared/kernel/value-object.base';
import { ProductRiskTier } from '../../../../shared/kernel/value-objects/product-risk-tier';
import { SettlementMode, SettlementModeValue } from './settlement-mode.vo';

export interface PlatformFloorConfig {
  holdingDaysByTier: Readonly<Record<ProductRiskTier, number>>;
  midtransSettlementDays: number;
  autoForceReleaseDays: number;
}

interface SettlementPolicyProps {
  mode: SettlementModeValue;
  config: PlatformFloorConfig;
}

export class SettlementPolicy extends ValueObject<SettlementPolicyProps> {
  private constructor(props: SettlementPolicyProps) {
    super(props);
  }

  static create(mode: SettlementMode, config: PlatformFloorConfig): SettlementPolicy {
    return new SettlementPolicy({ mode: mode.value, config });
  }

  get mode(): SettlementModeValue {
    return this.props.mode;
  }

  effectiveHoldUntil(params: {
    paidAt: Date;
    riskTier: ProductRiskTier;
    shippedAt?: Date | null;
    sellerRequestedHold?: Date | null;
  }): Date {
    const { paidAt, riskTier, shippedAt, sellerRequestedHold } = params;
    const { config } = this.props;

    const baseFrom = riskTier === 'medium' && shippedAt ? shippedAt : paidAt;
    const base = addDays(baseFrom, config.holdingDaysByTier[riskTier]);
    const midtransFloor = addDays(paidAt, config.midtransSettlementDays);
    const floor = maxDate([base, midtransFloor]);

    if (this.props.mode === 'auto' || !sellerRequestedHold) {
      return floor;
    }
    return maxDate([floor, sellerRequestedHold]);
  }

  forcedReleaseAt(paidAt: Date): Date {
    return addDays(paidAt, this.props.config.autoForceReleaseDays);
  }
}
