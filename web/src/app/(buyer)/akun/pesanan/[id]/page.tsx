'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { useOrder } from '@/features/orders/hooks/use-order';
import { OrderSummary } from '@/features/checkout/components/order-summary';

const BuyerOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isPending, isError, refetch } = useOrder(id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-10">
      <h1 className="text-2xl font-semibold">Detail pesanan</h1>

      {isPending && <Skeleton className="h-40 w-full" />}

      {isError && <ErrorState message="Pesanan tidak ditemukan." onRetry={() => void refetch()} />}

      {order && (
        <>
          <OrderSummary order={order} />
          {(order.status === 'holding' || order.status === 'released') && (
            <Button variant="outline" className="self-start" render={<Link href="/akun/unduhan" />}>
              Lihat unduhan
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default BuyerOrderDetailPage;
