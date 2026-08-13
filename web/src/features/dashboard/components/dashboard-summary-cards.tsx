'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoneyDisplay } from '@/components/data/money-display';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSummary } from '../hooks/use-dashboard-summary';
import { OnboardingChecklist } from './onboarding-checklist';
import type { PeriodMetrics } from '../types/dashboard.types';

type Period = 'today' | 'last7Days' | 'last30Days';

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hari ini' },
  { value: 'last7Days', label: '7 hari' },
  { value: 'last30Days', label: '30 hari' },
];

const isPeriod = (value: unknown): value is Period =>
  value === 'today' || value === 'last7Days' || value === 'last30Days';

const PeriodCards = ({ metrics }: { metrics: PeriodMetrics }) => (
  <div className="grid gap-4 sm:grid-cols-3">
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Pendapatan</CardTitle>
      </CardHeader>
      <CardContent>
        <MoneyDisplay value={metrics.revenue} className="text-xl font-semibold" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Pesanan</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-xl font-semibold tabular-nums">{metrics.orders}</span>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Pembeli</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-xl font-semibold tabular-nums">{metrics.buyers}</span>
      </CardContent>
    </Card>
  </div>
);

export const DashboardSummaryCards = () => {
  const [period, setPeriod] = useState<Period>('today');
  const { data, isPending, isError, refetch } = useDashboardSummary();

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <OnboardingChecklist onboarding={data.onboarding} />

      <Tabs
        value={period}
        onValueChange={(value) => {
          if (isPeriod(value)) setPeriod(value);
        }}
      >
        <TabsList>
          {PERIOD_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PeriodCards metrics={data[period]} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Saldo tertunda</CardTitle>
        </CardHeader>
        <CardContent>
          <MoneyDisplay value={data.pendingRelease.amount} className="text-xl font-semibold" />
          <p className="text-xs text-muted-foreground">{data.pendingRelease.count} pesanan menunggu pencairan</p>
        </CardContent>
      </Card>
    </div>
  );
};
