export interface PendingRelease {
  orderId: string;
  orderNumber: string;
  amount: string;
  releasesAt: string;
}

export interface BalanceSummary {
  holding: string;
  available: string;
  withdrawable: string;
  pendingReleases: PendingRelease[];
}

export type BalanceTransactionType =
  | 'order_paid_holding'
  | 'order_released'
  | 'withdrawal_paid'
  | 'refund_debit'
  | 'promo_adjustment';

export interface BalanceTransaction {
  id: string;
  type: BalanceTransactionType;
  amount: string;
  holdingBalanceAfter: string;
  availableBalanceAfter: string;
  note: string | null;
  orderId: string | null;
  createdAt: string;
}
