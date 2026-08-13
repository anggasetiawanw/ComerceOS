import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { dashboardKeys } from '../api/dashboard.keys';

export const useDashboardSummary = () =>
  useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: dashboardApi.getSummary,
  });
