'use client';

import { FileDown } from 'lucide-react';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { useDeliveries } from '../hooks/use-deliveries';
import { DeliveryRowCard } from './delivery-row-card';
import { DeliveriesSkeleton } from './deliveries-skeleton';

export const DeliveryList = () => {
  const { data, isPending, isError, refetch } = useDeliveries();

  return (
    <div className="flex flex-col gap-4">
      {isPending && <DeliveriesSkeleton />}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          icon={FileDown}
          title="Belum ada file"
          description="File digital yang kamu beli akan muncul di sini."
        />
      )}

      {data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((delivery) => (
            <DeliveryRowCard key={delivery.id} delivery={delivery} />
          ))}
        </div>
      )}
    </div>
  );
};
