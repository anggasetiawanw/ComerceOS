import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Invoice } from '../types/invoice.types';
import { InvoicePreview } from './invoice-preview';

export const InvoiceRowCard = ({ invoice }: { invoice: Invoice }) => (
  <Card>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
        {invoice.sentVia ? (
          <Badge variant="secondary">Terkirim</Badge>
        ) : (
          <Badge variant="outline">Sedang dibuat</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{formatWibDate(invoice.createdAt)}</p>
      {invoice.isRendered && (
        <div>
          <InvoicePreview invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
        </div>
      )}
    </CardContent>
  </Card>
);
