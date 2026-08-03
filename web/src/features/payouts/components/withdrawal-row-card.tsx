import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/data/money-display';
import type { Withdrawal } from '../types/payouts.types';
import { WithdrawalStatusBadge } from './withdrawal-status-badge';

export const WithdrawalRowCard = ({ withdrawal }: { withdrawal: Withdrawal }) => (
  <Card>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <MoneyDisplay value={withdrawal.amount} className="font-medium" />
        <WithdrawalStatusBadge status={withdrawal.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {withdrawal.bankName} — {withdrawal.accountNumber}
        </span>
        <span>{formatWibDate(withdrawal.requestedAt)}</span>
      </div>
    </CardContent>
  </Card>
);
