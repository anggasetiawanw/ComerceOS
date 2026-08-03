import { BalanceSummary } from '../../../application/services/balance-read.service';
import { PendingReleaseRow } from '../../../domain/repositories/balance-read.repository';

export class PendingReleaseResponseDto {
  orderId!: string;
  orderNumber!: string;
  amount!: string;
  releasesAt!: string;

  static fromRow(row: PendingReleaseRow): PendingReleaseResponseDto {
    const dto = new PendingReleaseResponseDto();
    dto.orderId = row.orderId;
    dto.orderNumber = row.orderNumber;
    dto.amount = row.amount;
    dto.releasesAt = row.releasesAt.toISOString();
    return dto;
  }
}

export class BalanceResponseDto {
  holding!: string;
  available!: string;
  pendingReleases!: PendingReleaseResponseDto[];

  static fromSummary(summary: BalanceSummary): BalanceResponseDto {
    const dto = new BalanceResponseDto();
    dto.holding = summary.holding;
    dto.available = summary.available;
    dto.pendingReleases = summary.pendingReleases.map((row) => PendingReleaseResponseDto.fromRow(row));
    return dto;
  }
}
