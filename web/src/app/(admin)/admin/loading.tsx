import { Skeleton } from '@/components/ui/skeleton';

const AdminLoading = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-8 w-40" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  </div>
);

export default AdminLoading;
