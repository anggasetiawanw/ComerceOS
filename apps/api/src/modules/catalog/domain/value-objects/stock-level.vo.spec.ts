import { StockLevel } from './stock-level.vo';

describe('StockLevel', () => {
  describe('create', () => {
    it('treats null as unlimited', () => {
      const result = StockLevel.create(null);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isUnlimited()).toBe(true);
    });

    it('accepts a non-negative integer', () => {
      const result = StockLevel.create(10);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().value).toBe(10);
    });

    it('accepts zero', () => {
      const result = StockLevel.create(0);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isDepleted()).toBe(true);
    });

    it('rejects a negative number', () => {
      const result = StockLevel.create(-1);
      expect(result.isErr()).toBe(true);
    });

    it('rejects a non-integer', () => {
      const result = StockLevel.create(1.5);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('unlimited', () => {
    it('has a null value and is never depleted', () => {
      const stock = StockLevel.unlimited();
      expect(stock.value).toBeNull();
      expect(stock.isUnlimited()).toBe(true);
      expect(stock.isDepleted()).toBe(false);
    });
  });

  describe('decrement', () => {
    it('is a no-op on unlimited stock', () => {
      const stock = StockLevel.unlimited();
      const result = stock.decrement(100);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isUnlimited()).toBe(true);
    });

    it('reduces a finite stock level', () => {
      const stock = StockLevel.of(10).unwrap();
      const result = stock.decrement(3);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().value).toBe(7);
    });

    it('allows decrementing to exactly zero', () => {
      const stock = StockLevel.of(5).unwrap();
      const result = stock.decrement(5);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isDepleted()).toBe(true);
    });

    it('rejects decrementing past zero', () => {
      const stock = StockLevel.of(2).unwrap();
      const result = stock.decrement(3);
      expect(result.isErr()).toBe(true);
    });

    it('rejects a negative quantity', () => {
      const stock = StockLevel.of(10).unwrap();
      const result = stock.decrement(-1);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('serializes a finite value as a number', () => {
      const stock = StockLevel.of(4).unwrap();
      expect(stock.toJSON()).toBe(4);
    });

    it('serializes unlimited as null', () => {
      expect(StockLevel.unlimited().toJSON()).toBeNull();
    });
  });
});
