import type { ColumnDef } from '@tanstack/react-table';
import { formatWibDate } from '@nagihin/contracts';
import { Badge } from '@/components/ui/badge';
import type { Invoice } from '../types/invoice.types';
import { InvoicePreview } from './invoice-preview';

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: 'invoiceNumber',
    header: 'Nomor invoice',
    cell: ({ row }) => <span className="font-mono">{row.original.invoiceNumber}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Tanggal',
    cell: ({ row }) => formatWibDate(row.original.createdAt),
  },
  {
    accessorKey: 'sentVia',
    header: 'Status',
    cell: ({ row }) =>
      row.original.sentVia ? (
        <Badge variant="secondary">Terkirim</Badge>
      ) : (
        <Badge variant="outline">Sedang dibuat</Badge>
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      row.original.isRendered ? (
        <InvoicePreview invoiceId={row.original.id} invoiceNumber={row.original.invoiceNumber} />
      ) : null,
  },
];
