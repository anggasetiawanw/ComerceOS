import { Skeleton } from '@/components/ui/skeleton';

const AuthLoading = () => (
  <div className="flex w-full max-w-sm flex-col gap-4">
    <Skeleton className="h-6 w-40" />
    <Skeleton className="h-40 w-full" />
  </div>
);

export default AuthLoading;
