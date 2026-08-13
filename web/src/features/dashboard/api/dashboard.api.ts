import { apiClient } from '@/lib/api/client';
import type { DashboardSummary } from '../types/dashboard.types';

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> => apiClient.get<DashboardSummary>('/dashboard/summary'),
};
