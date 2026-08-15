import { Skeleton } from '@/components/ui/skeleton';

const InquiriesLoading = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-10 w-full max-w-xs" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
  </div>
);

export default InquiriesLoading;
