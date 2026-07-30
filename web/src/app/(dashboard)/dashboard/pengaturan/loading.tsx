import { Skeleton } from '@/components/ui/skeleton';

const SettingsLoading = () => (
  <div className="flex flex-col gap-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default SettingsLoading;
