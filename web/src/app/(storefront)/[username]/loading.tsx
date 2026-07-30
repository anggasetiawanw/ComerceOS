import { Skeleton } from '@/components/ui/skeleton';

const StorefrontLoading = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="aspect-16/6 w-full rounded-b-lg" />
    <div className="flex flex-col items-center gap-2 px-4">
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>
  </div>
);

export default StorefrontLoading;
