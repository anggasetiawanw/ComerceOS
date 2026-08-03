import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import {
  BALANCE_READ_REPOSITORY,
  BalanceReadRepository,
  BalanceTransactionRow,
  PendingReleaseRow,
} from '../../domain/repositories/balance-read.repository';
import { WITHDRAWAL_REPOSITORY, WithdrawalRepository } from '../../domain/repositories/withdrawal.repository';
import { StoreBalanceNotFoundError } from '../../domain/errors/ledger.errors';

export interface BalanceSummary {
  holding: string;
  available: string;
  withdrawable: string;
  pendingReleases: PendingReleaseRow[];
}

// Reads the cached balance straight off the Store aggregate rather than
// StoreBalanceRepository.findForUpdate — a GET request must never take the
// row lock LedgerService uses for mutations (.docs/09 §4: the lock is what
// serializes writes; a read taking it would serialize reads against writes
// for no reason).
@Injectable()
export class BalanceReadService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(BALANCE_READ_REPOSITORY) private readonly reads: BalanceReadRepository,
    @Inject(WITHDRAWAL_REPOSITORY) private readonly withdrawals: WithdrawalRepository,
  ) {}

  async getBalance(storeId: string): Promise<Result<BalanceSummary, StoreBalanceNotFoundError>> {
    const store = await this.stores.findById(storeId);
    if (!store) return Result.err(new StoreBalanceNotFoundError());

    const [pendingReleases, pendingWithdrawals] = await Promise.all([
      this.reads.listPendingReleases(storeId),
      this.withdrawals.sumPendingByStore(storeId),
    ]);

    const pendingMoney = Money.fromRupiah(pendingWithdrawals).unwrap();
    const withdrawableResult = store.availableBalance.subtract(pendingMoney);
    const withdrawable = withdrawableResult.isErr() ? Money.zero() : withdrawableResult.unwrap();

    return Result.ok({
      holding: store.holdingBalance.toString(),
      available: store.availableBalance.toString(),
      withdrawable: withdrawable.toString(),
      pendingReleases,
    });
  }

  async listTransactions(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: BalanceTransactionRow[]; hasMore: boolean }> {
    return this.reads.listTransactions(params);
  }
}
