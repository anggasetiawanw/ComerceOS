import type { ColumnDef } from '@tanstack/react-table';
import { formatWibDate } from '@nagihin/contracts';
import { MoneyDisplay } from '@/components/data/money-display';
import { Badge } from '@/components/ui/badge';
import type { BalanceTransaction, BalanceTransactionType } from '../types/finance.types';

const LABEL_BY_TYPE: Record<BalanceTransactionType, string> = {
  order_paid_holding: 'Dana masuk',
  order_released: 'Dana cair',
  withdrawal_paid: 'Penarikan',
  refund_debit: 'Pengembalian dana',
  promo_adjustment: 'Penyesuaian',
};

export const ledgerColumns: ColumnDef<BalanceTransaction>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Tanggal',
    cell: ({ row }) => formatWibDate(row.original.createdAt),
  },
  {
    accessorKey: 'type',
    header: 'Jenis',
    cell: ({ row }) => <Badge variant="secondary">{LABEL_BY_TYPE[row.original.type]}</Badge>,
  },
  {
    accessorKey: 'amount',
    header: 'Jumlah',
    cell: ({ row }) => <MoneyDisplay value={row.original.amount} />,
  },
  {
    accessorKey: 'holdingBalanceAfter',
    header: 'Saldo ditahan',
    cell: ({ row }) => <MoneyDisplay value={row.original.holdingBalanceAfter} />,
  },
  {
    accessorKey: 'availableBalanceAfter',
    header: 'Saldo tersedia',
    cell: ({ row }) => <MoneyDisplay value={row.original.availableBalanceAfter} />,
  },
];
