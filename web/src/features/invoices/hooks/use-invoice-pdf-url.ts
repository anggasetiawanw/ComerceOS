import { useMutation } from '@tanstack/react-query';
import { invoiceApi } from '../api/invoice.api';

// A mutation, not a query — the signed URL expires in an hour, so it's
// fetched fresh on each "lihat PDF" click rather than cached.
export const useInvoicePdfUrl = () =>
  useMutation({
    mutationFn: (id: string) => invoiceApi.getPdfUrl(id),
  });
