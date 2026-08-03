import { Skeleton } from '@/components/ui/skeleton';

export const BalanceSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);
