import { Skeleton } from '@/components/ui/skeleton';

export const StoreSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-[16/5] w-full rounded-lg" />
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="h-9 w-full max-w-sm" />
      <Skeleton className="h-24 w-full max-w-sm" />
    </div>
  );
};
