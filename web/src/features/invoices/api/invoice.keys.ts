import type { ListInvoicesQuery } from './invoice.api';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (query: ListInvoicesQuery) => [...invoiceKeys.all, 'list', query] as const,
  pdf: (id: string) => [...invoiceKeys.all, 'pdf', id] as const,
};
