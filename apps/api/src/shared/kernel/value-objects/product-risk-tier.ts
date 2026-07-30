export const PRODUCT_RISK_TIERS = ['low', 'medium', 'high'] as const;

export type ProductRiskTier = (typeof PRODUCT_RISK_TIERS)[number];
