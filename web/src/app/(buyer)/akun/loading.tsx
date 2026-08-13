import { Skeleton } from '@/components/ui/skeleton';

const AkunLoading = () => (
  <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-10">
    <Skeleton className="h-8 w-48" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  </div>
);

export default AkunLoading;
