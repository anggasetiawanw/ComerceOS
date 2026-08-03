import { InvoiceNumber } from './invoice-number.vo';

describe('InvoiceNumber', () => {
  it('formats a counter as INV-{5-digit padded}', () => {
    expect(InvoiceNumber.fromCounter(1).value).toBe('INV-00001');
    expect(InvoiceNumber.fromCounter(42).value).toBe('INV-00042');
  });

  it('grows naturally past 5 digits without truncation', () => {
    expect(InvoiceNumber.fromCounter(123_456).value).toBe('INV-123456');
  });

  it('round-trips through create()', () => {
    const result = InvoiceNumber.create('INV-00007');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('INV-00007');
  });

  it('rejects a malformed value', () => {
    expect(InvoiceNumber.create('INV-1').isErr()).toBe(true);
    expect(InvoiceNumber.create('ORD-00001').isErr()).toBe(true);
    expect(InvoiceNumber.create('INV-abcde').isErr()).toBe(true);
  });
});
