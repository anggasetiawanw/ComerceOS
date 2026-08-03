export const BALANCE_READ_REPOSITORY = Symbol('BALANCE_READ_REPOSITORY');

export interface BalanceTransactionRow {
  id: string;
  type: string;
  amount: string;
  holdingBalanceAfter: string;
  availableBalanceAfter: string;
  note: string | null;
  orderId: string | null;
  createdAt: Date;
}

export interface PendingReleaseRow {
  orderId: string;
  orderNumber: string;
  amount: string;
  releasesAt: Date;
}

export interface BalanceReadRepository {
  listTransactions(params: {
    storeId: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: BalanceTransactionRow[]; hasMore: boolean }>;
  listPendingReleases(storeId: string): Promise<PendingReleaseRow[]>;
}
