import { Skeleton } from '@/components/ui/skeleton';

export const DeliveriesSkeleton = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
  </div>
);
