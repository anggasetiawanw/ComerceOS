import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { PlatformFee } from './platform-fee.vo';

const money = (amount: string) => Money.fromString(amount).unwrap();

describe('PlatformFee', () => {
  it('round-trips basis points through the Decimal(5,4) string representation', () => {
    const fee = PlatformFee.create(500, money('5000')).unwrap();
    expect(fee.toRateDecimalString()).toBe('0.0500');

    const reconstructed = PlatformFee.fromRateDecimalString(fee.toRateDecimalString(), money('5000')).unwrap();
    expect(reconstructed.rateBasisPoints).toBe(500);
  });

  it('round-trips the pro rate (2.5%)', () => {
    const fee = PlatformFee.create(250, money('2500')).unwrap();
    expect(fee.toRateDecimalString()).toBe('0.0250');
  });

  it('rejects a rate outside 0-10000 basis points', () => {
    expect(PlatformFee.create(-1, Money.zero()).isErr()).toBe(true);
    expect(PlatformFee.create(10_001, Money.zero()).isErr()).toBe(true);
  });

  it('rejects a non-integer basis points value', () => {
    expect(PlatformFee.create(500.5, Money.zero()).isErr()).toBe(true);
  });
});
