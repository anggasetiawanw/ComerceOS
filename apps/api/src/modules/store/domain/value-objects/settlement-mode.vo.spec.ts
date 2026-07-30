import { SettlementMode } from './settlement-mode.vo';

describe('SettlementMode', () => {
  it('creates from a valid value', () => {
    expect(SettlementMode.create('auto').isOk()).toBe(true);
    expect(SettlementMode.create('manual').isOk()).toBe(true);
  });

  it('rejects an invalid value', () => {
    expect(SettlementMode.create('instant').isErr()).toBe(true);
  });

  it('auto() and manual() seed the expected values', () => {
    expect(SettlementMode.auto().value).toBe('auto');
    expect(SettlementMode.manual().value).toBe('manual');
    expect(SettlementMode.manual().isManual()).toBe(true);
    expect(SettlementMode.auto().isManual()).toBe(false);
  });
});
