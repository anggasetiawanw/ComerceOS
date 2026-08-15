import { Phone } from './phone.vo';

describe('Phone', () => {
  it.each([
    ['08123456789', '628123456789'],
    ['628123456789', '628123456789'],
    ['+628123456789', '628123456789'],
    ['0812-3456-789', '628123456789'],
  ])('normalizes "%s" to "%s"', (raw, expected) => {
    const result = Phone.create(raw);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe(expected);
  });

  it('round-trips to local 08xx format', () => {
    const phone = Phone.create('628123456789').unwrap();
    expect(phone.toLocalFormat()).toBe('08123456789');
  });

  it('rejects a number with no recognizable country/trunk prefix', () => {
    const result = Phone.create('123456789');
    expect(result.isErr()).toBe(true);
  });

  it('rejects non-digit characters', () => {
    const result = Phone.create('08abcdefghi');
    expect(result.isErr()).toBe(true);
  });

  it('rejects an implausibly short number', () => {
    const result = Phone.create('0812');
    expect(result.isErr()).toBe(true);
  });

  it('builds a wa.me link with an optional prefilled message', () => {
    const phone = Phone.create('08123456789').unwrap();
    expect(phone.toWhatsAppLink()).toBe('https://wa.me/628123456789');
    expect(phone.toWhatsAppLink('Halo')).toBe('https://wa.me/628123456789?text=Halo');
  });
});
