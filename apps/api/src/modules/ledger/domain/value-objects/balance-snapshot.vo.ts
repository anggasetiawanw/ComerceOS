import { ValueObject } from '../../../../shared/kernel/value-object.base';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';

interface BalanceSnapshotProps {
  holding: Money;
  available: Money;
}

// Every ledger row carries the resulting balances so any single row is
// independently verifiable without trusting every prior row
// (.docs/04-entity-design.md §6).
export class BalanceSnapshot extends ValueObject<BalanceSnapshotProps> {
  private constructor(props: BalanceSnapshotProps) {
    super(props);
  }

  static of(holding: Money, available: Money): BalanceSnapshot {
    return new BalanceSnapshot({ holding, available });
  }

  get holding(): Money {
    return this.props.holding;
  }

  get available(): Money {
    return this.props.available;
  }
}
