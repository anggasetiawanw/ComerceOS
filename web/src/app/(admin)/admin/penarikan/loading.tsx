import { Skeleton } from '@/components/ui/skeleton';

const AdminWithdrawalsLoading = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-8 w-56" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  </div>
);

export default AdminWithdrawalsLoading;
