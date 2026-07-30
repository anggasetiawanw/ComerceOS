import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class SettlementModeError extends Error {}

export type SettlementModeValue = 'auto' | 'manual';

interface SettlementModeProps {
  value: SettlementModeValue;
}

const VALID_MODES: readonly SettlementModeValue[] = ['auto', 'manual'];

export class SettlementMode extends ValueObject<SettlementModeProps> {
  private constructor(props: SettlementModeProps) {
    super(props);
  }

  static create(value: string): Result<SettlementMode, SettlementModeError> {
    const match = VALID_MODES.find((mode) => mode === value);
    if (!match) {
      return Result.err(new SettlementModeError(`Invalid settlement mode: "${value}"`));
    }
    return Result.ok(new SettlementMode({ value: match }));
  }

  static auto(): SettlementMode {
    return new SettlementMode({ value: 'auto' });
  }

  static manual(): SettlementMode {
    return new SettlementMode({ value: 'manual' });
  }

  get value(): SettlementModeValue {
    return this.props.value;
  }

  isManual(): boolean {
    return this.props.value === 'manual';
  }
}
