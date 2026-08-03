import type { ColumnDef } from '@tanstack/react-table';
import { formatWibDate } from '@nagihin/contracts';
import { MoneyDisplay } from '@/components/data/money-display';
import { WithdrawalStatusBadge } from '@/features/payouts/components/withdrawal-status-badge';
import type { AdminWithdrawal } from '../types/admin.types';
import { AdminWithdrawalActions } from './admin-withdrawal-actions';

export const adminWithdrawalColumns: ColumnDef<AdminWithdrawal>[] = [
  {
    accessorKey: 'storeDisplayName',
    header: 'Toko',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.storeDisplayName}</span>
        <span className="text-xs text-muted-foreground">@{row.original.storeUsername}</span>
      </div>
    ),
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
        {row.original.bankName} — {row.original.accountNumber} ({row.original.accountHolderName})
      </span>
    ),
  },
  {
    accessorKey: 'requestedAt',
    header: 'Diajukan',
    cell: ({ row }) => formatWibDate(row.original.requestedAt),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <WithdrawalStatusBadge status={row.original.status} />,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <AdminWithdrawalActions withdrawal={row.original} />,
  },
];
