'use client';

import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoneyDisplay } from '@/components/data/money-display';
import { ErrorState } from '@/components/data/error-state';
import { useBalance } from '../hooks/use-balance';
import { BalanceSkeleton } from './balance-skeleton';

export const BalanceCard = () => {
  const { data, isPending, isError, refetch } = useBalance();

  if (isPending) return <BalanceSkeleton />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dana ditahan</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay value={data.holding} className="text-2xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay value={data.available} className="text-2xl font-semibold" />
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info />
        <AlertDescription>
          <strong>Dana ditahan</strong> adalah pembayaran yang sudah masuk tapi belum bisa ditarik — biasanya
          menunggu settlement Midtrans (T+3) atau periode penahanan produk. <strong>Saldo tersedia</strong> sudah
          bisa ditarik ke rekening bank kamu.
        </AlertDescription>
      </Alert>
    </div>
  );
};
