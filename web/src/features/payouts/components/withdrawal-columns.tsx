import type { ColumnDef } from '@tanstack/react-table';
import { formatWibDate } from '@nagihin/contracts';
import { MoneyDisplay } from '@/components/data/money-display';
import type { Withdrawal } from '../types/payouts.types';
import { WithdrawalStatusBadge } from './withdrawal-status-badge';

export const withdrawalColumns: ColumnDef<Withdrawal>[] = [
  {
    accessorKey: 'requestedAt',
    header: 'Diajukan',
    cell: ({ row }) => formatWibDate(row.original.requestedAt),
  },
  {
    accessorKey: 'amount',
    header: 'Jumlah',
    cell: ({ row }) => <MoneyDisplay value={row.original.amount} />,
  },
  {
    accessorKey: 'bankName',
    header: 'Rekening',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.bankName} — {row.original.accountNumber}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <WithdrawalStatusBadge status={row.original.status} />,
  },
];
