'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { useProducts } from '../hooks/use-products';
import type { ProductStatus } from '../types/product.types';
import { ProductRowCard } from './product-row-card';
import { ProductsSkeleton } from './products-skeleton';

const STATUS_TABS: { value: 'all' | ProductStatus; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draf' },
  { value: 'active', label: 'Aktif' },
  { value: 'archived', label: 'Diarsipkan' },
];

export const ProductList = () => {
  const [status, setStatus] = useState<'all' | ProductStatus>('all');
  const { data, isPending, isError, refetch } = useProducts(status === 'all' ? {} : { status });

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={status} onValueChange={(value) => setStatus(value as 'all' | ProductStatus)}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending && <ProductsSkeleton />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={Package}
          title="Belum ada produk"
          description="Buat produk pertamamu agar bisa dilihat dan dibeli di toko."
        />
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.items.map((product) => (
            <ProductRowCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
