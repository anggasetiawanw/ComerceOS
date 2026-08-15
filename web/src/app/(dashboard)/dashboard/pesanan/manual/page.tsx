'use client';

import { useSearchParams } from 'next/navigation';
import { ManualOrderForm } from '@/features/store-orders/components/manual-order-form';

const ManualOrderPage = () => {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get('inquiryId') ?? undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Buat pesanan manual</h1>
        <p className="text-sm text-muted-foreground">
          Untuk pembeli yang bayar di luar checkout, misalnya lewat obrolan WhatsApp.
        </p>
      </div>
      <ManualOrderForm inquiryId={inquiryId} />
    </div>
  );
};

export default ManualOrderPage;
