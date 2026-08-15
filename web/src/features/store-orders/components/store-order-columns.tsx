import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { formatWibDate } from '@nagihin/contracts';
import { Badge } from '@/components/ui/badge';
import { MoneyDisplay } from '@/components/data/money-display';
import { OrderStatusBadge } from '@/components/data/order-status-badge';
import type { StoreOrderListItem } from '../types/store-order.types';

export const storeOrderColumns: ColumnDef<StoreOrderListItem>[] = [
  {
    accessorKey: 'orderNumber',
    header: 'Pesanan',
    cell: ({ row }) => (
      <Link href={`/dashboard/pesanan/${row.original.id}`} className="font-medium hover:underline">
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'buyerName',
    header: 'Pembeli',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.buyerName}</span>
        <span className="text-xs text-muted-foreground">{row.original.buyerEmail}</span>
      </div>
    ),
  },
  {
    accessorKey: 'source',
    header: 'Sumber',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.source === 'manual' ? 'Manual' : 'Checkout'}</Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => <MoneyDisplay value={row.original.total} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Dibuat',
    cell: ({ row }) => formatWibDate(row.original.createdAt),
  },
];
