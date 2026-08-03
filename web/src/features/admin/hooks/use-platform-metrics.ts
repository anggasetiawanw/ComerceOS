import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { adminKeys } from '../api/admin.keys';

export const usePlatformMetrics = () =>
  useQuery({
    queryKey: adminKeys.metrics(),
    queryFn: adminApi.getMetrics,
  });
