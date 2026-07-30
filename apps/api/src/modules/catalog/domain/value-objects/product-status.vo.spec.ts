import { ProductStatus } from './product-status.vo';

describe('ProductStatus', () => {
  it('accepts "draft"', () => {
    const result = ProductStatus.create('draft');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().isDraft()).toBe(true);
  });

  it('accepts "active"', () => {
    const result = ProductStatus.create('active');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().isActive()).toBe(true);
  });

  it('accepts "archived"', () => {
    const result = ProductStatus.create('archived');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().isArchived()).toBe(true);
  });

  it('rejects an unknown status', () => {
    const result = ProductStatus.create('published');
    expect(result.isErr()).toBe(true);
  });

  it('exposes named factories', () => {
    expect(ProductStatus.draft().value).toBe('draft');
    expect(ProductStatus.active().value).toBe('active');
    expect(ProductStatus.archived().value).toBe('archived');
  });
});
