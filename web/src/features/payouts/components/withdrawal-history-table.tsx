'use client';

import { Wallet } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { useWithdrawals } from '../hooks/use-withdrawals';
import { withdrawalColumns } from './withdrawal-columns';
import { WithdrawalRowCard } from './withdrawal-row-card';

export const WithdrawalHistoryTable = () => {
  const { cursor, canGoPrev, goNext, goPrev } = useCursorPagination();
  const { data, isPending, isError, refetch } = useWithdrawals({ cursor });

  return (
    <DataTable
      columns={withdrawalColumns}
      data={data?.items ?? []}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      empty={{
        icon: Wallet,
        title: 'Belum ada penarikan',
        description: 'Riwayat penarikan saldo kamu akan muncul di sini.',
      }}
      pagination={{
        hasMore: data?.meta.hasMore ?? false,
        canGoPrev,
        onNext: () => goNext(data?.meta.nextCursor ?? null),
        onPrev: goPrev,
      }}
      renderCard={(withdrawal) => <WithdrawalRowCard withdrawal={withdrawal} />}
      getRowId={(withdrawal) => withdrawal.id}
    />
  );
};
