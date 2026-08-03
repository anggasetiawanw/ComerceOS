import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/data/money-display';
import { WithdrawalStatusBadge } from '@/features/payouts/components/withdrawal-status-badge';
import type { AdminWithdrawal } from '../types/admin.types';
import { AdminWithdrawalActions } from './admin-withdrawal-actions';

export const AdminWithdrawalRowCard = ({ withdrawal }: { withdrawal: AdminWithdrawal }) => (
  <Card>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">{withdrawal.storeDisplayName}</span>
          <span className="text-xs text-muted-foreground">@{withdrawal.storeUsername}</span>
        </div>
        <WithdrawalStatusBadge status={withdrawal.status} />
      </div>
      <MoneyDisplay value={withdrawal.amount} className="text-lg font-semibold" />
      <div className="text-xs text-muted-foreground">
        {withdrawal.bankName} — {withdrawal.accountNumber} ({withdrawal.accountHolderName})
      </div>
      <div className="text-xs text-muted-foreground">Diajukan {formatWibDate(withdrawal.requestedAt)}</div>
      <AdminWithdrawalActions withdrawal={withdrawal} />
    </CardContent>
  </Card>
);
