'use client';

import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyStore } from '@/features/store/hooks/use-my-store';
import { CreateStoreCard } from '@/features/store/components/create-store-card';
import { DashboardSummaryCards } from '@/features/dashboard/components/dashboard-summary-cards';

const DashboardOverviewPage = () => {
  const { data: store, isPending, isError, refetch } = useMyStore();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan pendapatan dan pesanan tokomu.</p>
      </div>

      {isPending && <Skeleton className="h-24 w-full" />}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {!isPending && !isError && !store && <CreateStoreCard />}

      {!isPending && !isError && store && <DashboardSummaryCards />}
    </div>
  );
};

export default DashboardOverviewPage;
