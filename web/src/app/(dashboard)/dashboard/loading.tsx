import { Skeleton } from '@/components/ui/skeleton';

const DashboardLoading = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-8 w-56" />
    <div className="grid gap-4 sm:grid-cols-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-24 w-full" />
  </div>
);

export default DashboardLoading;
