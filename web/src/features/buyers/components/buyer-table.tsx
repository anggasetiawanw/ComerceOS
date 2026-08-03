'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { DataTable } from '@/components/data/data-table';
import { useCursorPagination } from '@/hooks/use-cursor-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { useBuyers } from '../hooks/use-buyers';
import type { StoreBuyerSort } from '../types/buyer.types';
import { buyerColumns } from './buyer-columns';
import { BuyerRowCard } from './buyer-row-card';
import { BuyerSearch } from './buyer-search';

export const BuyerTable = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StoreBuyerSort>('recent');
  const debouncedSearch = useDebounce(search, 300);
  const { cursor, canGoPrev, goNext, goPrev, reset } = useCursorPagination();

  const { data, isPending, isError, refetch } = useBuyers({ search: debouncedSearch || undefined, sort, cursor });

  return (
    <div className="flex flex-col gap-4">
      <BuyerSearch
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          reset();
        }}
        sort={sort}
        onSortChange={(value) => {
          setSort(value);
          reset();
        }}
      />
      <DataTable
        columns={buyerColumns}
        data={data?.items ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: Users,
          title: 'Belum ada pembeli',
          description: 'Bagikan link toko kamu untuk mulai mendapatkan pembeli.',
        }}
        pagination={{
          hasMore: data?.meta.hasMore ?? false,
          canGoPrev,
          onNext: () => goNext(data?.meta.nextCursor ?? null),
          onPrev: goPrev,
        }}
        renderCard={(buyer) => <BuyerRowCard buyer={buyer} />}
        getRowId={(buyer) => buyer.id}
      />
    </div>
  );
};
