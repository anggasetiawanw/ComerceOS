'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { useOrderStatus } from '@/features/checkout/hooks/use-order-status';
import { OrderSummary } from '@/features/checkout/components/order-summary';
import type { OrderStatus } from '@/features/orders/types/order.types';

const SUCCESS_STATUSES: readonly OrderStatus[] = ['paid', 'holding', 'released'];
const FAILURE_STATUSES: readonly OrderStatus[] = ['cancelled', 'expired'];

const CheckoutStatusPage = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data: order, isLoading, isError, refetch } = useOrderStatus(orderNumber);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 p-4 py-10 text-center">
      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && <ErrorState message="Pesanan tidak ditemukan." onRetry={() => void refetch()} />}

      {order && (
        <>
          {order.status === 'pending_payment' && (
            <>
              <Loader2 className="size-10 animate-spin text-muted-foreground" />
              <h1 className="text-xl font-semibold">Menunggu pembayaran</h1>
              <p className="text-sm text-muted-foreground">
                Halaman ini akan otomatis diperbarui setelah pembayaran diterima.
              </p>
            </>
          )}

          {SUCCESS_STATUSES.includes(order.status) && (
            <>
              <CheckCircle2 className="size-10 text-primary" />
              <h1 className="text-xl font-semibold">Pembayaran berhasil</h1>
              <p className="text-sm text-muted-foreground">Terima kasih! Pesananmu sedang diproses.</p>
              <div className="flex gap-2">
                <Button variant="outline" render={<Link href={`/akun/pesanan/${order.id}`} />}>
                  Lihat pesanan
                </Button>
                <Button render={<Link href="/akun/unduhan" />}>Unduhan saya</Button>
              </div>
            </>
          )}

          {FAILURE_STATUSES.includes(order.status) && (
            <>
              <XCircle className="size-10 text-destructive" />
              <h1 className="text-xl font-semibold">
                {order.status === 'expired' ? 'Pesanan kedaluwarsa' : 'Pesanan dibatalkan'}
              </h1>
              <p className="text-sm text-muted-foreground">Silakan buat pesanan baru jika masih ingin membeli.</p>
            </>
          )}

          <div className="w-full">
            <OrderSummary order={order} />
          </div>
        </>
      )}
    </div>
  );
};

export default CheckoutStatusPage;
