import { Skeleton } from '@/components/ui/skeleton';

const CheckoutLoading = () => (
  <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 py-10">
    <Skeleton className="h-6 w-24" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

export default CheckoutLoading;
