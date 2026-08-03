'use client';

import { BalanceCard } from '@/features/finance/components/balance-card';
import { HoldingCountdown } from '@/features/finance/components/holding-countdown';
import { LedgerTable } from '@/features/finance/components/ledger-table';

const FinancePage = () => {
  return (
    <div className="flex flex-col gap-6">
      <BalanceCard />
      <HoldingCountdown />
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Riwayat mutasi</h2>
        <LedgerTable />
      </div>
    </div>
  );
};

export default FinancePage;
