'use client';

import { Receipt } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { useLedgerTransactions } from '../hooks/use-ledger-transactions';
import { ledgerColumns } from './ledger-columns';
import { LedgerRowCard } from './ledger-row-card';

export const LedgerTable = () => {
  const { cursor, canGoPrev, goNext, goPrev } = useCursorPagination();
  const { data, isPending, isError, refetch } = useLedgerTransactions({ cursor });

  return (
    <DataTable
      columns={ledgerColumns}
      data={data?.items ?? []}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      empty={{
        icon: Receipt,
        title: 'Belum ada mutasi',
        description: 'Riwayat dana masuk dan cair akan muncul di sini setelah ada pesanan yang dibayar.',
      }}
      pagination={{
        hasMore: data?.meta.hasMore ?? false,
        canGoPrev,
        onNext: () => goNext(data?.meta.nextCursor ?? null),
        onPrev: goPrev,
      }}
      renderCard={(transaction) => <LedgerRowCard transaction={transaction} />}
      getRowId={(transaction) => transaction.id}
    />
  );
};
