import { PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/data/empty-state';

export const StorefrontEmpty = () => (
  <div className="px-4 py-10">
    <EmptyState
      icon={PackageSearch}
      title="Belum ada produk"
      description="Toko ini belum menambahkan produk."
    />
  </div>
);
