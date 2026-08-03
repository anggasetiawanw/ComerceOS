'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WithdrawableCard } from '@/features/payouts/components/withdrawable-card';
import { WithdrawalRequestForm } from '@/features/payouts/components/withdrawal-request-form';
import { WithdrawalHistoryTable } from '@/features/payouts/components/withdrawal-history-table';

const WithdrawalsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <WithdrawableCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajukan penarikan</CardTitle>
        </CardHeader>
        <CardContent>
          <WithdrawalRequestForm />
        </CardContent>
      </Card>
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Riwayat penarikan</h2>
        <WithdrawalHistoryTable />
      </div>
    </div>
  );
};

export default WithdrawalsPage;
