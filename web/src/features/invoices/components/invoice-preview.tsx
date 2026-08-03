'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvoicePdfUrl } from '../hooks/use-invoice-pdf-url';

// Opens a freshly-signed PDF URL in a new tab rather than rendering the
// shared HTML template in an iframe — the invoice snapshot (order/store/buyer
// detail needed to render InvoiceViewModel client-side) is not exposed over
// the API this sprint, so this stays a link to the rendered PDF instead of
// an in-page preview. Recorded as drift against .docs/11's InvoicePreview
// spec.
export const InvoicePreview = ({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) => {
  const { mutate, isPending } = useInvoicePdfUrl();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        mutate(invoiceId, {
          onSuccess: (pdf) => window.open(pdf.url, '_blank', 'noopener,noreferrer'),
        })
      }
    >
      <FileText className="size-4" />
      Lihat {invoiceNumber}
    </Button>
  );
};
