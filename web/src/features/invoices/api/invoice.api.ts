import { apiClient, type CursorResult } from '@/lib/api/client';
import type { Invoice, InvoicePdf } from '../types/invoice.types';

export interface ListInvoicesQuery {
  cursor?: string;
  limit?: number;
}

export const invoiceApi = {
  list: (query: ListInvoicesQuery = {}): Promise<CursorResult<Invoice>> => {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getCursorPaginated<Invoice>(`/invoices?${params.toString()}`);
  },
  getPdfUrl: (id: string): Promise<InvoicePdf> => apiClient.get<InvoicePdf>(`/invoices/${id}/pdf`),
};
