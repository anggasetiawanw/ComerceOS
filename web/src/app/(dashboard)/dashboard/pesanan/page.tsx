'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreOrderTable } from '@/features/store-orders/components/store-order-table';

const OrdersPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Pesanan</h1>
          <p className="text-sm text-muted-foreground">Semua pesanan dari checkout dan yang kamu buat manual.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/dashboard/pesanan/pertanyaan" />}>
            Pertanyaan
          </Button>
          <Button render={<Link href="/dashboard/pesanan/manual" />}>Buat pesanan manual</Button>
        </div>
      </div>
      <StoreOrderTable />
    </div>
  );
};

export default OrdersPage;
