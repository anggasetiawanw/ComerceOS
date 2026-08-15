import { apiClient, type CursorResult } from '@/lib/api/client';
import type { ManualOrderItemInput } from '@/features/inquiries/api/inquiry.api';
import type { StoreOrderDetail, StoreOrderListItem, StoreOrderListQuery } from '../types/store-order.types';

export interface CreateManualOrderInput {
  items: ManualOrderItemInput[];
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string | null;
}

export const storeOrderApi = {
  list: (query: StoreOrderListQuery = {}): Promise<CursorResult<StoreOrderListItem>> => {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.source) params.set('source', query.source);
    if (query.createdFrom) params.set('createdFrom', query.createdFrom);
    if (query.createdTo) params.set('createdTo', query.createdTo);
    if (query.buyerSearch) params.set('buyerSearch', query.buyerSearch);
    if (query.cursor) params.set('cursor', query.cursor);
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getCursorPaginated<StoreOrderListItem>(`/orders?${params.toString()}`);
  },
  getById: (id: string): Promise<StoreOrderDetail> => apiClient.get<StoreOrderDetail>(`/orders/${id}`),
  createManual: (input: CreateManualOrderInput): Promise<StoreOrderDetail> =>
    apiClient.post<StoreOrderDetail>('/orders/manual', input, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }),
  confirmPayment: (id: string) => apiClient.post(`/orders/${id}/confirm-payment`),
  cancel: (id: string) => apiClient.post(`/orders/${id}/cancel`),
  release: (id: string) => apiClient.post(`/orders/${id}/release`),
};
