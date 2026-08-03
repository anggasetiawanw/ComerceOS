import type { ColumnDef } from '@tanstack/react-table';
import { formatWibDate } from '@nagihin/contracts';
import { MoneyDisplay } from '@/components/data/money-display';
import type { StoreBuyer } from '../types/buyer.types';

export const buyerColumns: ColumnDef<StoreBuyer>[] = [
  {
    accessorKey: 'buyerName',
    header: 'Pembeli',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.buyerName}</span>
        <span className="text-xs text-muted-foreground">{row.original.buyerEmail}</span>
      </div>
    ),
  },
  {
    accessorKey: 'totalOrders',
    header: 'Pesanan',
  },
  {
    accessorKey: 'totalSpent',
    header: 'Total belanja',
    cell: ({ row }) => <MoneyDisplay value={row.original.totalSpent} />,
  },
  {
    accessorKey: 'lastPurchaseAt',
    header: 'Pembelian terakhir',
    cell: ({ row }) => formatWibDate(row.original.lastPurchaseAt),
  },
];
