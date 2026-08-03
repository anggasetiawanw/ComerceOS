import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { Withdrawal } from '../../domain/entities/withdrawal.aggregate';
import { WITHDRAWAL_REPOSITORY, WithdrawalRepository } from '../../domain/repositories/withdrawal.repository';
import {
  AdminWithdrawalRow,
  WITHDRAWAL_READ_REPOSITORY,
  WithdrawalReadRepository,
  WithdrawalRow,
} from '../../domain/repositories/withdrawal-read.repository';
import { WithdrawalNotFoundError } from '../../domain/errors/ledger.errors';

@Injectable()
export class WithdrawalReadService {
  constructor(
    @Inject(WITHDRAWAL_REPOSITORY) private readonly withdrawals: WithdrawalRepository,
    @Inject(WITHDRAWAL_READ_REPOSITORY) private readonly reads: WithdrawalReadRepository,
  ) {}

  // Same information-hiding precedent as InvoiceReadService.getForStore and
  // ReleaseOrderService: a store mismatch is "not found", never "forbidden",
  // so a seller probing ids cannot distinguish the two.
  async getForStore(storeId: string, withdrawalId: string): Promise<Result<Withdrawal, WithdrawalNotFoundError>> {
    const withdrawal = await this.withdrawals.findById(withdrawalId);
    if (!withdrawal || !withdrawal.belongsToStore(storeId)) {
      return Result.err(new WithdrawalNotFoundError());
    }
    return Result.ok(withdrawal);
  }

  async listByStore(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: WithdrawalRow[]; hasMore: boolean }> {
    return this.reads.listByStore(params);
  }

  async listForAdmin(params: {
    status?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AdminWithdrawalRow[]; hasMore: boolean }> {
    return this.reads.listForAdmin(params);
  }
}
