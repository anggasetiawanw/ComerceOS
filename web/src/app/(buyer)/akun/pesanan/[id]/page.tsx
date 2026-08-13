'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { ApiError } from '@/lib/api/client';
import { useOrder } from '@/features/orders/hooks/use-order';
import { OrderSummary } from '@/features/checkout/components/order-summary';

const BuyerOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isPending, isError, error, refetch } = useOrder(id);

  const isNotFound = error instanceof ApiError && error.problem.status === 404;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-10">
      <h1 className="text-2xl font-semibold">Detail pesanan</h1>

      {isPending && <Skeleton className="h-40 w-full" />}

      {isError && isNotFound && (
        <EmptyState icon={Receipt} title="Pesanan tidak ditemukan" description="Pesanan ini mungkin tidak ada atau bukan milikmu." />
      )}

      {isError && !isNotFound && <ErrorState message="Gagal memuat pesanan." onRetry={() => void refetch()} />}

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
