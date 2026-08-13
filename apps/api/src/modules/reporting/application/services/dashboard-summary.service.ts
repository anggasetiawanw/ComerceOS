import { Injectable } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

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

interface PeriodRow {
  today_revenue: bigint | null;
  today_orders: bigint;
  today_buyers: bigint;
  week_revenue: bigint | null;
  week_orders: bigint;
  week_buyers: bigint;
  month_revenue: bigint | null;
  month_orders: bigint;
  month_buyers: bigint;
}

interface PendingReleaseRow {
  count: bigint;
  amount: bigint | null;
}

interface OnboardingRow {
  has_profile: boolean;
  has_published_product: boolean;
  has_bank_account: boolean;
  has_first_sale: boolean;
}

// Read-only, raw SQL, no writes — the Reporting bounded context
// (.docs/03-bounded-contexts.md §3.14), same pattern as
// PlatformMetricsService. "Today" is a UTC calendar day — there is no
// per-store timezone concept anywhere in this codebase yet.
@Injectable()
export class DashboardSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(storeId: string): Promise<DashboardSummary> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysStart = subDays(now, 7);
    const thirtyDaysStart = subDays(now, 30);

    const [periodRows, pendingRows, onboardingRows] = await Promise.all([
      this.prisma.$queryRaw<PeriodRow[]>`
        SELECT
          COALESCE(SUM(total) FILTER (WHERE paid_at >= ${todayStart}), 0) AS today_revenue,
          COUNT(*) FILTER (WHERE paid_at >= ${todayStart}) AS today_orders,
          COUNT(DISTINCT buyer_id) FILTER (WHERE paid_at >= ${todayStart}) AS today_buyers,
          COALESCE(SUM(total) FILTER (WHERE paid_at >= ${sevenDaysStart}), 0) AS week_revenue,
          COUNT(*) FILTER (WHERE paid_at >= ${sevenDaysStart}) AS week_orders,
          COUNT(DISTINCT buyer_id) FILTER (WHERE paid_at >= ${sevenDaysStart}) AS week_buyers,
          COALESCE(SUM(total) FILTER (WHERE paid_at >= ${thirtyDaysStart}), 0) AS month_revenue,
          COUNT(*) FILTER (WHERE paid_at >= ${thirtyDaysStart}) AS month_orders,
          COUNT(DISTINCT buyer_id) FILTER (WHERE paid_at >= ${thirtyDaysStart}) AS month_buyers
        FROM orders
        WHERE store_id = ${storeId} AND paid_at IS NOT NULL AND status <> 'refunded'
      `,
      this.prisma.$queryRaw<PendingReleaseRow[]>`
        SELECT COUNT(*) AS count, COALESCE(SUM(total - platform_fee_amount), 0) AS amount
        FROM orders
        WHERE store_id = ${storeId} AND status = 'holding'
      `,
      this.prisma.$queryRaw<OnboardingRow[]>`
        SELECT
          EXISTS (
            SELECT 1 FROM stores WHERE id = ${storeId} AND avatar_url IS NOT NULL AND bio IS NOT NULL
          ) AS has_profile,
          EXISTS (SELECT 1 FROM products WHERE store_id = ${storeId} AND status = 'active') AS has_published_product,
          EXISTS (SELECT 1 FROM bank_accounts WHERE store_id = ${storeId}) AS has_bank_account,
          EXISTS (SELECT 1 FROM orders WHERE store_id = ${storeId} AND paid_at IS NOT NULL) AS has_first_sale
      `,
    ]);

    const period = periodRows[0];
    const pending = pendingRows[0];
    const onboarding = onboardingRows[0];

    return {
      today: {
        revenue: (period?.today_revenue ?? 0n).toString(),
        orders: Number(period?.today_orders ?? 0n),
        buyers: Number(period?.today_buyers ?? 0n),
      },
      last7Days: {
        revenue: (period?.week_revenue ?? 0n).toString(),
        orders: Number(period?.week_orders ?? 0n),
        buyers: Number(period?.week_buyers ?? 0n),
      },
      last30Days: {
        revenue: (period?.month_revenue ?? 0n).toString(),
        orders: Number(period?.month_orders ?? 0n),
        buyers: Number(period?.month_buyers ?? 0n),
      },
      pendingRelease: {
        count: Number(pending?.count ?? 0n),
        amount: (pending?.amount ?? 0n).toString(),
      },
      onboarding: {
        hasProfile: onboarding?.has_profile ?? false,
        hasPublishedProduct: onboarding?.has_published_product ?? false,
        hasBankAccount: onboarding?.has_bank_account ?? false,
        hasFirstSale: onboarding?.has_first_sale ?? false,
      },
    };
  }
}
