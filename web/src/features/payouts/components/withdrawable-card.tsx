'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/data/money-display';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBalance } from '@/features/finance/hooks/use-balance';

export const WithdrawableCard = () => {
  const { data, isPending, isError, refetch } = useBalance();

  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo yang bisa ditarik</CardTitle>
      </CardHeader>
      <CardContent>
        <MoneyDisplay value={data.withdrawable} className="text-2xl font-semibold" />
      </CardContent>
    </Card>
  );
};
