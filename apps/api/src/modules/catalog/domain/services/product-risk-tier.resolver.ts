import { ProductRiskTier } from '../../../../shared/kernel/value-objects/product-risk-tier';
import { ProductType, ProductTypeValue } from '../value-objects/product-type.vo';

const RISK_TIER_BY_TYPE: Readonly<Record<ProductTypeValue, ProductRiskTier>> = {
  digital: 'low',
  physical: 'medium',
  service: 'high',
};

const RISK_TIER_RANK: Readonly<Record<ProductRiskTier, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

export class ProductRiskTierResolver {
  resolve(productType: ProductType): ProductRiskTier {
    return RISK_TIER_BY_TYPE[productType.value];
  }

  maxOf(productTypes: readonly ProductType[]): ProductRiskTier {
    return productTypes.reduce<ProductRiskTier>((highest, current) => {
      const tier = this.resolve(current);
      return RISK_TIER_RANK[tier] > RISK_TIER_RANK[highest] ? tier : highest;
    }, 'low');
  }
}
