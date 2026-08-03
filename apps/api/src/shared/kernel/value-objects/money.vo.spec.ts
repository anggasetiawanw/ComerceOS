import { Money } from './money.vo';

describe('Money', () => {
  it('never produces fractional rupiah', () => {
    const result = Money.fromRupiah(10.5);
    expect(result.isErr()).toBe(true);
  });

  it('rejects a negative amount', () => {
    const result = Money.fromRupiah(-1);
    expect(result.isErr()).toBe(true);
  });

  it('constructs from a whole number of rupiah', () => {
    const result = Money.fromRupiah(15000);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().toString()).toBe('15000');
  });

  it('constructs from a bigint', () => {
    const result = Money.fromRupiah(15000n);
    expect(result.unwrap().amount).toBe(15000n);
  });

  it('parses a digit string and rejects anything else', () => {
    expect(Money.fromString('15000').unwrap().toString()).toBe('15000');
    expect(Money.fromString('15000.50').isErr()).toBe(true);
    expect(Money.fromString('abc').isErr()).toBe(true);
  });

  it('adds without loss', () => {
    const a = Money.fromRupiah(15000).unwrap();
    const b = Money.fromRupiah(2500).unwrap();
    expect(a.add(b).toString()).toBe('17500');
  });

  it('refuses subtraction that would go negative', () => {
    const a = Money.fromRupiah(1000).unwrap();
    const b = Money.fromRupiah(2000).unwrap();
    expect(a.subtract(b).isErr()).toBe(true);
  });

  it('rounds percentages half-up', () => {
    const amount = Money.fromRupiah(10001).unwrap();
    expect(amount.percentageBasisPoints(500).unwrap().toString()).toBe('500');

    const amount2 = Money.fromRupiah(100).unwrap();
    expect(amount2.percentageBasisPoints(250).unwrap().toString()).toBe('3');
  });

  it('refuses implicit number coercion', () => {
    const money = Money.fromRupiah(1000).unwrap();
    expect(() => `${money}`).toThrow();
    expect(() => Number(money)).toThrow();
  });

  it('compares by value, not by reference', () => {
    const a = Money.fromRupiah(1000).unwrap();
    const b = Money.fromRupiah(1000).unwrap();
    const c = Money.fromRupiah(2000).unwrap();
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('multiplies by a non-negative integer quantity', () => {
    const price = Money.fromRupiah(15000).unwrap();
    expect(price.multiply(3).unwrap().toString()).toBe('45000');
    expect(price.multiply(0).unwrap().toString()).toBe('0');
  });

  it('refuses multiplying by a negative or fractional factor', () => {
    const price = Money.fromRupiah(15000).unwrap();
    expect(price.multiply(-1).isErr()).toBe(true);
    expect(price.multiply(1.5).isErr()).toBe(true);
  });

  it('min returns the smaller of two amounts', () => {
    const small = Money.fromRupiah(1000).unwrap();
    const large = Money.fromRupiah(2000).unwrap();
    expect(small.min(large).toString()).toBe('1000');
    expect(large.min(small).toString()).toBe('1000');
  });
});
