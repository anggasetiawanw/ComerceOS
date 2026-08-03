import { apiClient, type CursorResult } from '@/lib/api/client';
import type { StoreBuyer, StoreBuyerSort } from '../types/buyer.types';

export interface ListBuyersQuery {
  search?: string;
  sort?: StoreBuyerSort;
  cursor?: string;
  limit?: number;
}

export const buyerApi = {
  list: (query: ListBuyersQuery = {}): Promise<CursorResult<StoreBuyer>> => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    params.set('sort', query.sort ?? 'recent');
    if (query.cursor) params.set('cursor', query.cursor);
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getCursorPaginated<StoreBuyer>(`/buyers?${params.toString()}`);
  },
};
