import { Skeleton } from '@/components/ui/skeleton';

export const InvoicesSkeleton = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-full" />
    <Skeleton className="h-14 w-full" />
  </div>
);
