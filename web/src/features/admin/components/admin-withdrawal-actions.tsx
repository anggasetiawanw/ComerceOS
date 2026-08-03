'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import type { AdminWithdrawal } from '../types/admin.types';
import { useApproveWithdrawal, useMarkWithdrawalPaid, useRejectWithdrawal } from '../hooks/use-admin-withdrawals';
import { RejectWithdrawalDialog } from './reject-withdrawal-dialog';

export const AdminWithdrawalActions = ({ withdrawal }: { withdrawal: AdminWithdrawal }) => {
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const markPaid = useMarkWithdrawalPaid();

  if (withdrawal.status === 'requested') {
    return (
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" disabled={approve.isPending} onClick={() => approve.mutate(withdrawal.id)}>
          {approve.isPending && approve.variables === withdrawal.id ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            'Setujui'
          )}
        </Button>
        <RejectWithdrawalDialog
          trigger={
            <Button type="button" size="sm" variant="destructive">
              Tolak
            </Button>
          }
          onConfirm={(reason) => reject.mutateAsync({ id: withdrawal.id, reason })}
        />
      </div>
    );
  }

  if (withdrawal.status === 'approved') {
    return (
      <div className="flex justify-end gap-2">
        <ConfirmDialog
          trigger={
            <Button type="button" size="sm" disabled={markPaid.isPending}>
              Tandai lunas
            </Button>
          }
          title="Tandai penarikan sudah dibayar"
          description="Pastikan transfer bank sudah benar-benar dilakukan sebelum menandai ini. Saldo tersedia penjual akan didebit sekarang."
          confirmLabel="Tandai lunas"
          onConfirm={async () => {
            await markPaid.mutateAsync(withdrawal.id);
          }}
        />
        <RejectWithdrawalDialog
          trigger={
            <Button type="button" size="sm" variant="destructive">
              Tolak
            </Button>
          }
          onConfirm={(reason) => reject.mutateAsync({ id: withdrawal.id, reason })}
        />
      </div>
    );
  }

  return null;
};
