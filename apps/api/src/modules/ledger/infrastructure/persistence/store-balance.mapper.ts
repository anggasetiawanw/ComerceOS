import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { StoreBalance } from '../../domain/entities/store-balance.aggregate';

export interface StoreBalanceRow {
  id: string;
  holding_balance: bigint;
  available_balance: bigint;
}

export class StoreBalanceMapper {
  static toDomain(row: StoreBalanceRow): StoreBalance {
    const holdingResult = Money.fromRupiah(row.holding_balance);
    if (holdingResult.isErr()) {
      throw new Error(`Corrupt store row: invalid holding balance for store "${row.id}"`);
    }
    const availableResult = Money.fromRupiah(row.available_balance);
    if (availableResult.isErr()) {
      throw new Error(`Corrupt store row: invalid available balance for store "${row.id}"`);
    }

    return StoreBalance.reconstitute({
      storeId: row.id,
      holding: holdingResult.unwrap(),
      available: availableResult.unwrap(),
    });
  }
}
