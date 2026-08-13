export interface PeriodMetrics {
  revenue: string;
  orders: number;
  buyers: number;
}

export interface PendingReleaseSummary {
  count: number;
  amount: string;
}

export interface OnboardingStatus {
  hasProfile: boolean;
  hasPublishedProduct: boolean;
  hasBankAccount: boolean;
  hasFirstSale: boolean;
}

export interface DashboardSummary {
  today: PeriodMetrics;
  last7Days: PeriodMetrics;
  last30Days: PeriodMetrics;
  pendingRelease: PendingReleaseSummary;
  onboarding: OnboardingStatus;
}
