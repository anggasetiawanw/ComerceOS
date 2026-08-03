'use client';

import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { useOrders } from '../hooks/use-orders';
import { OrderRowCard } from './order-row-card';
import { OrdersSkeleton } from './orders-skeleton';

export const OrderList = () => {
  const { data, isPending, isError, refetch } = useOrders();

  return (
    <div className="flex flex-col gap-4">
      {isPending && <OrdersSkeleton />}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.items.length === 0 && (
        <EmptyState icon={Receipt} title="Belum ada pesanan" description="Pesananmu akan muncul di sini." />
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.items.map((order) => (
            <OrderRowCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};
