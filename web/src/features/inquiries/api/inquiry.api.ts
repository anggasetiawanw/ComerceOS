import { apiClient, type PaginatedResult } from '@/lib/api/client';
import type { StoreOrderDetail } from '@/features/store-orders/types/store-order.types';
import type { CreateInquiryResult, Inquiry, InquiryStatus } from '../types/inquiry.types';

export interface ListInquiriesQuery {
  status?: InquiryStatus;
  page?: number;
  limit?: number;
}

export interface ManualOrderItemInput {
  productId: string;
  qty: number;
  priceOverride?: string;
}

export interface ConvertInquiryInput {
  items: ManualOrderItemInput[];
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string | null;
}

export const inquiryApi = {
  // Public endpoint — no login required. The access token still gets
  // attached when one happens to be present (default apiClient behavior),
  // which is what lets the API record a real buyerId for a logged-in
  // visitor without a separate anonymous-vs-authenticated code path here.
  create: (username: string, productId: string | null): Promise<CreateInquiryResult> =>
    apiClient.post<CreateInquiryResult>(`/storefront/${encodeURIComponent(username)}/inquiries`, {
      productId: productId ?? undefined,
    }),
  list: (query: ListInquiriesQuery = {}): Promise<PaginatedResult<Inquiry>> => {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getPaginated<Inquiry>(`/inquiries?${params.toString()}`);
  },
  convert: (id: string, input: ConvertInquiryInput): Promise<StoreOrderDetail> =>
    apiClient.post<StoreOrderDetail>(`/inquiries/${id}/convert`, input),
  markLost: (id: string): Promise<Inquiry> => apiClient.post<Inquiry>(`/inquiries/${id}/mark-lost`),
};
