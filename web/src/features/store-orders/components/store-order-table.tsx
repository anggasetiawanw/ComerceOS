'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import type { OrderStatus } from '@/features/orders/types/order.types';
import { useStoreOrders } from '../hooks/use-store-orders';
import type { OrderSource } from '../types/store-order.types';
import { storeOrderColumns } from './store-order-columns';
import { StoreOrderRowCard } from './store-order-row-card';
import { StoreOrderFilters } from './store-order-filters';

export const StoreOrderTable = () => {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [source, setSource] = useState<OrderSource | 'all'>('all');
  const [buyerSearch, setBuyerSearch] = useState('');
  const debouncedBuyerSearch = useDebounce(buyerSearch, 300);
  const { cursor, canGoPrev, goNext, goPrev, reset } = useCursorPagination();

  const { data, isPending, isError, refetch } = useStoreOrders({
    status: status === 'all' ? undefined : status,
    source: source === 'all' ? undefined : source,
    buyerSearch: debouncedBuyerSearch || undefined,
    cursor,
  });

  const resetAndSet = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    reset();
  };

  return (
    <div className="flex flex-col gap-4">
      <StoreOrderFilters
        status={status}
        onStatusChange={resetAndSet(setStatus)}
        source={source}
        onSourceChange={resetAndSet(setSource)}
        buyerSearch={buyerSearch}
        onBuyerSearchChange={resetAndSet(setBuyerSearch)}
      />
      <DataTable
        columns={storeOrderColumns}
        data={data?.items ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Receipt,
          title: 'Belum ada pesanan',
          description: 'Pesanan dari storefront atau yang kamu buat manual akan muncul di sini.',
        }}
        pagination={{
          hasMore: data?.meta.hasMore ?? false,
          canGoPrev,
          onNext: () => goNext(data?.meta.nextCursor ?? null),
          onPrev: goPrev,
        }}
        renderCard={(order) => <StoreOrderRowCard order={order} />}
        getRowId={(order) => order.id}
      />
    </div>
  );
};
