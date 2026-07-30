'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { ApiError } from '@/lib/api/client';
import { useChangeSettlementMode, useStoreSettings } from '../hooks/use-settlement-mode';

export const SettlementModeCard = () => {
  const { data: settings, isPending, isError, refetch } = useStoreSettings();
  const changeMode = useChangeSettlementMode();
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mode pencairan dana</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !settings) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const isManual = settings.settlementMode === 'manual';

  const handleChange = async (checked: boolean) => {
    setError(null);
    try {
      await changeMode.mutateAsync(checked ? 'manual' : 'auto');
    } catch (mutationError) {
      setError(mutationError instanceof ApiError ? mutationError.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mode pencairan dana</CardTitle>
        <CardDescription>
          Dana masuk paling cepat T+{settings.midtransSettlementDays} hari setelah settlement Midtrans.
          Mode manual hanya bisa memperpanjang masa tahan, tidak bisa mempercepat pencairan.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center gap-3">
          <Switch
            id="settlement-mode"
            checked={isManual}
            onCheckedChange={handleChange}
            disabled={changeMode.isPending}
          />
          <Label htmlFor="settlement-mode">{isManual ? 'Manual' : 'Otomatis'}</Label>
        </div>
      </CardContent>
    </Card>
  );
};
