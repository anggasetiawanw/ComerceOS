import { apiClient, type CursorResult } from '@/lib/api/client';
import type { Withdrawal } from '@/features/payouts/types/payouts.types';
import type { AdminWithdrawal, PlatformMetrics } from '../types/admin.types';

export interface ListAdminWithdrawalsQuery {
  status?: string;
  cursor?: string;
  limit?: number;
}

export const adminApi = {
  getMetrics: (): Promise<PlatformMetrics> => apiClient.get<PlatformMetrics>('/admin/metrics'),

  listWithdrawals: (query: ListAdminWithdrawalsQuery = {}): Promise<CursorResult<AdminWithdrawal>> => {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.cursor) params.set('cursor', query.cursor);
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getCursorPaginated<AdminWithdrawal>(`/admin/withdrawals?${params.toString()}`);
  },
  approveWithdrawal: (id: string): Promise<Withdrawal> => apiClient.post<Withdrawal>(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal: (id: string, reason?: string): Promise<Withdrawal> =>
    apiClient.post<Withdrawal>(`/admin/withdrawals/${id}/reject`, { reason }),
  markWithdrawalPaid: (id: string): Promise<Withdrawal> =>
    apiClient.post<Withdrawal>(`/admin/withdrawals/${id}/mark-paid`),
};
