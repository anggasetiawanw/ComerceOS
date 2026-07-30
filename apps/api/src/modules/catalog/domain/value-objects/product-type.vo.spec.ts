import { ProductType } from './product-type.vo';

describe('ProductType', () => {
  it('accepts "digital"', () => {
    const result = ProductType.create('digital');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().isDigital()).toBe(true);
  });

  it('accepts "physical"', () => {
    const result = ProductType.create('physical');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().isPhysical()).toBe(true);
  });

  it('accepts "service"', () => {
    const result = ProductType.create('service');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().isService()).toBe(true);
  });

  it('rejects an unknown type', () => {
    const result = ProductType.create('subscription');
    expect(result.isErr()).toBe(true);
  });

  it('rejects an uppercase variant instead of normalizing it', () => {
    const result = ProductType.create('Digital');
    expect(result.isErr()).toBe(true);
  });

  it('exposes named factories', () => {
    expect(ProductType.digital().value).toBe('digital');
    expect(ProductType.physical().value).toBe('physical');
    expect(ProductType.service().value).toBe('service');
  });

  it('isDigital/isPhysical/isService are mutually exclusive', () => {
    const digital = ProductType.digital();
    expect(digital.isDigital()).toBe(true);
    expect(digital.isPhysical()).toBe(false);
    expect(digital.isService()).toBe(false);
  });
});
