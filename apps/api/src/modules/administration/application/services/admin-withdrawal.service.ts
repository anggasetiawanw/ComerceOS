import { Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { Withdrawal } from '../../../ledger/domain/entities/withdrawal.aggregate';
import { MarkPaidError, ReviewWithdrawalError, WithdrawalService } from '../../../ledger/application/services/withdrawal.service';
import { WithdrawalReadService } from '../../../ledger/application/services/withdrawal-read.service';
import { AdminWithdrawalRow } from '../../../ledger/domain/repositories/withdrawal-read.repository';

// Administration never touches the withdrawals table directly — it only
// calls ledger's own WithdrawalService/WithdrawalReadService (Decision 3,
// .docs/12-roadmap-sprints.md Sprint 7 drift notes), so the withdrawal
// invariant stays enforced in exactly one place.
@Injectable()
export class AdminWithdrawalService {
  constructor(
    private readonly withdrawals: WithdrawalService,
    private readonly withdrawalReads: WithdrawalReadService,
  ) {}

  async listQueue(params: {
    status?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AdminWithdrawalRow[]; hasMore: boolean }> {
    return this.withdrawalReads.listForAdmin(params);
  }

  async approve(withdrawalId: string, adminUserId: string): Promise<Result<Withdrawal, ReviewWithdrawalError>> {
    return this.withdrawals.approve(withdrawalId, adminUserId);
  }

  async reject(withdrawalId: string, adminUserId: string, reason?: string): Promise<Result<Withdrawal, ReviewWithdrawalError>> {
    return this.withdrawals.reject(withdrawalId, adminUserId, reason);
  }

  async markPaid(withdrawalId: string, adminUserId: string): Promise<Result<Withdrawal, MarkPaidError>> {
    return this.withdrawals.markPaid(withdrawalId, adminUserId);
  }
}
