import { Skeleton } from '@/components/ui/skeleton';

export const StoreOrdersSkeleton = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-10 w-full max-w-md" />
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-full" />
  </div>
);
