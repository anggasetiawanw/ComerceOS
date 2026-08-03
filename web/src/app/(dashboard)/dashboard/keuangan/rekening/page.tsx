'use client';

import { BankAccountList } from '@/features/payouts/components/bank-account-list';

const BankAccountsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <BankAccountList />
    </div>
  );
};

export default BankAccountsPage;
