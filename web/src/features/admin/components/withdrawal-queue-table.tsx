'use client';

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { useAdminWithdrawals } from '../hooks/use-admin-withdrawals';
import { adminWithdrawalColumns } from './admin-withdrawal-columns';
import { AdminWithdrawalRowCard } from './admin-withdrawal-row-card';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua status' },
  { value: 'requested', label: 'Diajukan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'paid', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

export const WithdrawalQueueTable = () => {
  const [status, setStatus] = useState('all');
  const { cursor, canGoPrev, goNext, goPrev, reset } = useCursorPagination();
  const { data, isPending, isError, refetch } = useAdminWithdrawals({
    status: status === 'all' ? undefined : status,
    cursor,
  });

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={status}
        onValueChange={(value) => {
          setStatus(value ?? 'all');
          reset();
        }}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DataTable
        columns={adminWithdrawalColumns}
        data={data?.items ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Inbox,
          title: 'Tidak ada penarikan',
          description: 'Belum ada pengajuan penarikan pada status ini.',
        }}
        pagination={{
          hasMore: data?.meta.hasMore ?? false,
          canGoPrev,
          onNext: () => goNext(data?.meta.nextCursor ?? null),
          onPrev: goPrev,
        }}
        renderCard={(withdrawal) => <AdminWithdrawalRowCard withdrawal={withdrawal} />}
        getRowId={(withdrawal) => withdrawal.id}
      />
    </div>
  );
};
