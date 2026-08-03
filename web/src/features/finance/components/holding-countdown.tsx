'use client';

import { Clock3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { MoneyDisplay } from '@/components/data/money-display';
import { formatWibDate } from '@nagihin/contracts';
import { useBalance } from '../hooks/use-balance';
import { BalanceSkeleton } from './balance-skeleton';

// A static explanation rather than a per-order derived reason — the backend
// doesn't compute which specific floor (Midtrans settlement vs. product
// tier) produced each holding_until yet. Recorded as drift against
// .docs/11-frontend.md's HoldingCountdown spec; the date + a general
// explanation still tells a seller what's going on and when.
export const HoldingCountdown = () => {
  const { data, isPending, isError, refetch } = useBalance();

  if (isPending) return <BalanceSkeleton />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jadwal pencairan</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <Clock3 />
          <AlertDescription>
            Dana dicairkan otomatis setelah periode penahanan berakhir — biasanya T+3 setelah settlement Midtrans,
            atau lebih lama untuk produk fisik/jasa.
          </AlertDescription>
        </Alert>

        {data.pendingReleases.length === 0 ? (
          <EmptyState icon={Clock3} title="Tidak ada dana yang ditahan" description="Semua dana kamu sudah cair." />
        ) : (
          <div className="flex flex-col gap-2">
            {data.pendingReleases.map((release) => (
              <div
                key={release.orderId}
                className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm">{release.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">Cair pada {formatWibDate(release.releasesAt)}</span>
                </div>
                <MoneyDisplay value={release.amount} className="font-medium" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
