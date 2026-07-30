'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { PlanBadge } from '@/features/store/components/plan-badge';
import { SettlementModeCard } from '@/features/store/components/settlement-mode-card';
import { GoogleLinkCard } from '@/features/account/components/google-link-card';
import { useStoreSettings } from '@/features/store/hooks/use-settlement-mode';

const FEE_RATE_LABEL: Record<string, string> = {
  free: '5%',
  pro: '2.5%',
};

const PlanCard = () => {
  const { data: settings, isPending, isError, refetch } = useStoreSettings();

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paket</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !settings) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Paket
          <PlanBadge plan={settings.plan} />
        </CardTitle>
        <CardDescription>
          Biaya platform saat ini: {FEE_RATE_LABEL[settings.plan] ?? FEE_RATE_LABEL.free}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" disabled>
          Upgrade ke Pro (segera hadir)
        </Button>
      </CardContent>
    </Card>
  );
};

const SettingsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola mode pencairan dana, paket, dan akun yang terhubung.
        </p>
      </div>

      <SettlementModeCard />
      <PlanCard />
      <GoogleLinkCard />
    </div>
  );
};

export default SettingsPage;
