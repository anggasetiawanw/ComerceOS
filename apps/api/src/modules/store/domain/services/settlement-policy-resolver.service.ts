import { PlatformFloorConfig, SettlementPolicy } from '../value-objects/settlement-policy.vo';
import { SettlementMode } from '../value-objects/settlement-mode.vo';

export class SettlementPolicyResolver {
  constructor(private readonly config: PlatformFloorConfig) {}

  resolve(mode: SettlementMode): SettlementPolicy {
    return SettlementPolicy.create(mode, this.config);
  }
}
