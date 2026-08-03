import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoneyDisplay } from '@/components/data/money-display';
import type { BalanceTransaction, BalanceTransactionType } from '../types/finance.types';

const LABEL_BY_TYPE: Record<BalanceTransactionType, string> = {
  order_paid_holding: 'Dana masuk',
  order_released: 'Dana cair',
  withdrawal_paid: 'Penarikan',
  refund_debit: 'Pengembalian dana',
  promo_adjustment: 'Penyesuaian',
};

export const LedgerRowCard = ({ transaction }: { transaction: BalanceTransaction }) => (
  <Card>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{LABEL_BY_TYPE[transaction.type]}</Badge>
        <MoneyDisplay value={transaction.amount} className="font-medium" />
      </div>
      <p className="text-xs text-muted-foreground">{formatWibDate(transaction.createdAt)}</p>
    </CardContent>
  </Card>
);
