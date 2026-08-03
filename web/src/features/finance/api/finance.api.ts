import { apiClient, type CursorResult } from '@/lib/api/client';
import type { BalanceSummary, BalanceTransaction } from '../types/finance.types';

export interface ListTransactionsQuery {
  cursor?: string;
  limit?: number;
}

export const financeApi = {
  getBalance: (): Promise<BalanceSummary> => apiClient.get<BalanceSummary>('/balance'),
  listTransactions: (query: ListTransactionsQuery = {}): Promise<CursorResult<BalanceTransaction>> => {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getCursorPaginated<BalanceTransaction>(`/balance/transactions?${params.toString()}`);
  },
};
