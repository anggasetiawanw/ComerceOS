'use client';

import { BuyerTable } from '@/features/buyers/components/buyer-table';

const BuyersPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pembeli</h1>
        <p className="text-sm text-muted-foreground">Semua orang yang pernah membeli dari toko kamu.</p>
      </div>
      <BuyerTable />
    </div>
  );
};

export default BuyersPage;
