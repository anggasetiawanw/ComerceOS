export const WITHDRAWAL_READ_REPOSITORY = Symbol('WITHDRAWAL_READ_REPOSITORY');

export interface WithdrawalRow {
  id: string;
  storeId: string;
  amount: string;
  status: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  requestedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  paidAt: Date | null;
  adminNote: string | null;
}

export interface AdminWithdrawalRow extends WithdrawalRow {
  storeUsername: string;
  storeDisplayName: string;
}

export interface WithdrawalReadRepository {
  listByStore(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: WithdrawalRow[]; hasMore: boolean }>;

  listForAdmin(params: {
    status?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AdminWithdrawalRow[]; hasMore: boolean }>;
}
