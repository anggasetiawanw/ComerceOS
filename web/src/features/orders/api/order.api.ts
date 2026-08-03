import { apiClient, type PaginatedResult } from '@/lib/api/client';
import type { BuyerOrderListItem, Order } from '../types/order.types';

export interface BuyerOrderListQuery {
  page?: number;
  limit?: number;
}

export const orderApi = {
  list: (query: BuyerOrderListQuery = {}): Promise<PaginatedResult<BuyerOrderListItem>> => {
    const params = new URLSearchParams();
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getPaginated<BuyerOrderListItem>(`/me/orders?${params.toString()}`);
  },
  getById: (id: string): Promise<Order> => apiClient.get<Order>(`/me/orders/${id}`),
};
