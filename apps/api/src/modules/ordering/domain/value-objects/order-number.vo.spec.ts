import { OrderNumber } from './order-number.vo';

describe('OrderNumber', () => {
  it('generates a value matching ORD-yyMMdd-XXXXXX', () => {
    const orderNumber = OrderNumber.generate(new Date('2026-08-02T00:00:00.000Z'));
    expect(orderNumber.value).toMatch(/^ORD-260802-[A-Z0-9]{6}$/);
  });

  it('generates unique values across calls', () => {
    const first = OrderNumber.generate();
    const second = OrderNumber.generate();
    expect(first.value).not.toBe(second.value);
  });

  it('accepts a well-formed order number', () => {
    const result = OrderNumber.create('ORD-260802-AB3XZ9');
    expect(result.isOk()).toBe(true);
  });

  it('rejects a malformed order number', () => {
    expect(OrderNumber.create('not-an-order-number').isErr()).toBe(true);
    expect(OrderNumber.create('ORD-2608-AB3XZ9').isErr()).toBe(true);
  });
});
