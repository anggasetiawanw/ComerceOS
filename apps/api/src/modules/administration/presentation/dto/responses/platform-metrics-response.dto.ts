import { PlatformMetrics } from '../../../application/services/platform-metrics.service';

export class PlatformMetricsResponseDto {
  gmv!: string;
  platformRevenue!: string;
  takeRate!: number;
  totalSellerLiability!: string;
  activeStores!: number;
  pendingWithdrawalCount!: number;
  pendingWithdrawalAmount!: string;

  static fromMetrics(metrics: PlatformMetrics): PlatformMetricsResponseDto {
    const dto = new PlatformMetricsResponseDto();
    dto.gmv = metrics.gmv;
    dto.platformRevenue = metrics.platformRevenue;
    dto.takeRate = metrics.takeRate;
    dto.totalSellerLiability = metrics.totalSellerLiability;
    dto.activeStores = metrics.activeStores;
    dto.pendingWithdrawalCount = metrics.pendingWithdrawalCount;
    dto.pendingWithdrawalAmount = metrics.pendingWithdrawalAmount;
    return dto;
  }
}
