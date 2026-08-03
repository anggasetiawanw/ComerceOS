import { addDays } from 'date-fns';
import { SettlementMode } from '../../../store/domain/value-objects/settlement-mode.vo';
import { SettlementPolicy } from '../../../store/domain/value-objects/settlement-policy.vo';
import { HoldingPeriodCalculator } from './holding-period.calculator';

const CONFIG = {
  holdingDaysByTier: { low: 0, medium: 3, high: 7 },
  midtransSettlementDays: 3,
  autoForceReleaseDays: 30,
};

describe('HoldingPeriodCalculator', () => {
  const calculator = new HoldingPeriodCalculator();
  const autoPolicy = SettlementPolicy.create(SettlementMode.auto(), CONFIG);
  const paidAt = new Date('2026-08-01T00:00:00.000Z');

  it('a digital-only order respects the Midtrans settlement floor, not T+0', () => {
    const holdingUntil = calculator.compute({ riskTiers: ['low'], paidAt, settlementPolicy: autoPolicy });
    expect(holdingUntil).toEqual(addDays(paidAt, CONFIG.midtransSettlementDays));
  });

  it('a mixed digital + physical basket takes the higher (physical) tier', () => {
    const holdingUntil = calculator.compute({ riskTiers: ['low', 'medium'], paidAt, settlementPolicy: autoPolicy });
    expect(holdingUntil).toEqual(addDays(paidAt, CONFIG.holdingDaysByTier.medium));
  });

  it('a service order holds for the full high-tier period', () => {
    const holdingUntil = calculator.compute({ riskTiers: ['high'], paidAt, settlementPolicy: autoPolicy });
    expect(holdingUntil).toEqual(addDays(paidAt, CONFIG.holdingDaysByTier.high));
  });

  it('recomputes a physical order from shippedAt once tracking is entered', () => {
    const shippedAt = new Date('2026-08-04T00:00:00.000Z');
    const holdingUntil = calculator.compute({
      riskTiers: ['medium'],
      paidAt,
      shippedAt,
      settlementPolicy: autoPolicy,
    });
    expect(holdingUntil).toEqual(addDays(shippedAt, CONFIG.holdingDaysByTier.medium));
  });

  it('manual mode may extend the hold via a seller-requested date, never shorten it', () => {
    const manualPolicy = SettlementPolicy.create(SettlementMode.manual(), CONFIG);
    const sellerRequestedHold = addDays(paidAt, 10);

    const holdingUntil = calculator.compute({
      riskTiers: ['low'],
      paidAt,
      settlementPolicy: manualPolicy,
      sellerRequestedHold,
    });

    expect(holdingUntil).toEqual(sellerRequestedHold);
  });

  it('an empty item list defaults to the lowest tier', () => {
    const holdingUntil = calculator.compute({ riskTiers: [], paidAt, settlementPolicy: autoPolicy });
    expect(holdingUntil).toEqual(addDays(paidAt, CONFIG.midtransSettlementDays));
  });
});
