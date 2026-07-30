import { Skeleton } from '@/components/ui/skeleton';

const ProductLoading = () => (
  <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
    <Skeleton className="aspect-square w-full rounded-lg" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-16 w-full" />
    </div>
  </div>
);

export default ProductLoading;
