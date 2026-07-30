import { ProductType } from '../value-objects/product-type.vo';
import { ProductRiskTierResolver } from './product-risk-tier.resolver';

describe('ProductRiskTierResolver', () => {
  const resolver = new ProductRiskTierResolver();

  describe('resolve', () => {
    it('maps digital to low', () => {
      expect(resolver.resolve(ProductType.digital())).toBe('low');
    });

    it('maps physical to medium', () => {
      expect(resolver.resolve(ProductType.physical())).toBe('medium');
    });

    it('maps service to high', () => {
      expect(resolver.resolve(ProductType.service())).toBe('high');
    });
  });

  describe('maxOf', () => {
    it('returns low for an all-digital basket', () => {
      expect(resolver.maxOf([ProductType.digital(), ProductType.digital()])).toBe('low');
    });

    it('returns the highest tier in a mixed basket', () => {
      expect(resolver.maxOf([ProductType.digital(), ProductType.physical()])).toBe('medium');
      expect(resolver.maxOf([ProductType.digital(), ProductType.service()])).toBe('high');
      expect(resolver.maxOf([ProductType.physical(), ProductType.service()])).toBe('high');
    });

    it('returns low for an empty basket', () => {
      expect(resolver.maxOf([])).toBe('low');
    });
  });
});
