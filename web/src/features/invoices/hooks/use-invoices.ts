import { useQuery } from '@tanstack/react-query';
import { invoiceApi, type ListInvoicesQuery } from '../api/invoice.api';
import { invoiceKeys } from '../api/invoice.keys';

export const useInvoices = (query: ListInvoicesQuery = {}) =>
  useQuery({
    queryKey: invoiceKeys.list(query),
    queryFn: () => invoiceApi.list(query),
  });
