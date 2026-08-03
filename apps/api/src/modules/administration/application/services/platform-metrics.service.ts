import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface PlatformMetrics {
  gmv: string;
  platformRevenue: string;
  takeRate: number;
  totalSellerLiability: string;
  activeStores: number;
  pendingWithdrawalCount: number;
  pendingWithdrawalAmount: string;
}

interface GmvRow {
  gmv: bigint | null;
}

interface RevenueRow {
  revenue: bigint | null;
}

interface LiabilityRow {
  liability: bigint | null;
}

interface ActiveStoresRow {
  count: bigint;
}

interface PendingWithdrawalsRow {
  count: bigint;
  amount: bigint | null;
}

// Read-only, raw SQL, no writes — owns nothing (.docs/03-bounded-contexts.md
// §3.14's "Reporting" pattern, reused here since these three numbers are the
// admin finance screen's whole point, per .docs/09-payments-ledger.md §4:
// "the moment they are on different screens someone starts treating the
// bank balance as spendable"). Platform revenue is derived, never a ledger
// table, matching the same section's rule.
@Injectable()
export class PlatformMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<PlatformMetrics> {
    const [gmvRows, revenueRows, liabilityRows, activeStoresRows, pendingRows] = await Promise.all([
      this.prisma.$queryRaw<GmvRow[]>`
        SELECT SUM(total) AS gmv FROM orders WHERE paid_at IS NOT NULL AND status <> 'refunded'
      `,
      this.prisma.$queryRaw<RevenueRow[]>`
        SELECT SUM(platform_fee_amount) AS revenue FROM orders WHERE released_at IS NOT NULL AND status <> 'refunded'
      `,
      this.prisma.$queryRaw<LiabilityRow[]>`
        SELECT SUM(holding_balance + available_balance) AS liability FROM stores
      `,
      this.prisma.$queryRaw<ActiveStoresRow[]>`
        SELECT COUNT(DISTINCT store_id) AS count FROM orders WHERE paid_at IS NOT NULL
      `,
      this.prisma.$queryRaw<PendingWithdrawalsRow[]>`
        SELECT COUNT(*) AS count, SUM(amount) AS amount FROM withdrawals WHERE status IN ('requested', 'approved')
      `,
    ]);

    const gmv = gmvRows[0]?.gmv ?? 0n;
    const revenue = revenueRows[0]?.revenue ?? 0n;
    const liability = liabilityRows[0]?.liability ?? 0n;
    const activeStores = activeStoresRows[0]?.count ?? 0n;
    const pendingCount = pendingRows[0]?.count ?? 0n;
    const pendingAmount = pendingRows[0]?.amount ?? 0n;

    return {
      gmv: gmv.toString(),
      platformRevenue: revenue.toString(),
      takeRate: gmv > 0n ? Number(revenue) / Number(gmv) : 0,
      totalSellerLiability: liability.toString(),
      activeStores: Number(activeStores),
      pendingWithdrawalCount: Number(pendingCount),
      pendingWithdrawalAmount: pendingAmount.toString(),
    };
  }
}
