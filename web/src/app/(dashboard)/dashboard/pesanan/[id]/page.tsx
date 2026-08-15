'use client';

import { useParams } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { ApiError } from '@/lib/api/client';
import { useStoreOrder } from '@/features/store-orders/hooks/use-store-order';
import { StoreOrderDetail } from '@/features/store-orders/components/store-order-detail';

const StoreOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isPending, isError, error, refetch } = useStoreOrder(id);

  const isNotFound = error instanceof ApiError && error.problem.status === 404;

  return (
    <div className="flex flex-col gap-6">
      {isPending && <Skeleton className="h-96 w-full" />}

      {isError && isNotFound && (
        <EmptyState icon={Receipt} title="Pesanan tidak ditemukan" description="Pesanan ini mungkin tidak ada atau bukan milik toko kamu." />
      )}

      {isError && !isNotFound && <ErrorState message="Gagal memuat pesanan." onRetry={() => void refetch()} />}

      {order && <StoreOrderDetail order={order} />}
    </div>
  );
};

export default StoreOrderDetailPage;
