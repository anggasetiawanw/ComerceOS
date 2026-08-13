import {
  DashboardSummary,
  OnboardingStatus,
  PendingReleaseSummary,
  PeriodMetrics,
} from '../../../application/services/dashboard-summary.service';

export class PeriodMetricsResponseDto {
  revenue!: string;
  orders!: number;
  buyers!: number;

  static fromMetrics(metrics: PeriodMetrics): PeriodMetricsResponseDto {
    const dto = new PeriodMetricsResponseDto();
    dto.revenue = metrics.revenue;
    dto.orders = metrics.orders;
    dto.buyers = metrics.buyers;
    return dto;
  }
}

export class PendingReleaseSummaryResponseDto {
  count!: number;
  amount!: string;

  static fromSummary(summary: PendingReleaseSummary): PendingReleaseSummaryResponseDto {
    const dto = new PendingReleaseSummaryResponseDto();
    dto.count = summary.count;
    dto.amount = summary.amount;
    return dto;
  }
}

export class OnboardingStatusResponseDto {
  hasProfile!: boolean;
  hasPublishedProduct!: boolean;
  hasBankAccount!: boolean;
  hasFirstSale!: boolean;

  static fromStatus(status: OnboardingStatus): OnboardingStatusResponseDto {
    const dto = new OnboardingStatusResponseDto();
    dto.hasProfile = status.hasProfile;
    dto.hasPublishedProduct = status.hasPublishedProduct;
    dto.hasBankAccount = status.hasBankAccount;
    dto.hasFirstSale = status.hasFirstSale;
    return dto;
  }
}

export class DashboardSummaryResponseDto {
  today!: PeriodMetricsResponseDto;
  last7Days!: PeriodMetricsResponseDto;
  last30Days!: PeriodMetricsResponseDto;
  pendingRelease!: PendingReleaseSummaryResponseDto;
  onboarding!: OnboardingStatusResponseDto;

  static fromSummary(summary: DashboardSummary): DashboardSummaryResponseDto {
    const dto = new DashboardSummaryResponseDto();
    dto.today = PeriodMetricsResponseDto.fromMetrics(summary.today);
    dto.last7Days = PeriodMetricsResponseDto.fromMetrics(summary.last7Days);
    dto.last30Days = PeriodMetricsResponseDto.fromMetrics(summary.last30Days);
    dto.pendingRelease = PendingReleaseSummaryResponseDto.fromSummary(summary.pendingRelease);
    dto.onboarding = OnboardingStatusResponseDto.fromStatus(summary.onboarding);
    return dto;
  }
}
