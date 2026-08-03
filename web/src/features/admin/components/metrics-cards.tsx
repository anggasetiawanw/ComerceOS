'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/data/money-display';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformMetrics } from '../hooks/use-platform-metrics';

// All three numbers from .docs/09-payments-ledger.md §4 land on one screen
// deliberately — the moment they're on different screens someone starts
// treating the bank balance as spendable.
export const MetricsCards = () => {
  const { data, isPending, isError, refetch } = usePlatformMetrics();

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">GMV</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyDisplay value={data.gmv} className="text-xl font-semibold" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Pendapatan platform</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyDisplay value={data.platformRevenue} className="text-xl font-semibold" />
          <p className="text-xs text-muted-foreground">Take rate {(data.takeRate * 100).toFixed(2)}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Total liabilitas seller</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyDisplay value={data.totalSellerLiability} className="text-xl font-semibold" />
          <p className="text-xs text-muted-foreground">{data.activeStores} toko aktif</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Penarikan tertunda</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyDisplay value={data.pendingWithdrawalAmount} className="text-xl font-semibold" />
          <p className="text-xs text-muted-foreground">{data.pendingWithdrawalCount} pengajuan</p>
        </CardContent>
      </Card>
    </div>
  );
};
