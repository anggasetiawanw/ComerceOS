import type { Withdrawal } from '@/features/payouts/types/payouts.types';

export interface AdminWithdrawal extends Withdrawal {
  storeUsername: string;
  storeDisplayName: string;
}

export interface PlatformMetrics {
  gmv: string;
  platformRevenue: string;
  takeRate: number;
  totalSellerLiability: string;
  activeStores: number;
  pendingWithdrawalCount: number;
  pendingWithdrawalAmount: string;
}
