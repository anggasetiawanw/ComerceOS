'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductList } from '@/features/products/components/product-list';

const ProductsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Produk</h1>
          <p className="text-sm text-muted-foreground">Kelola produk yang dijual di toko kamu.</p>
        </div>
        <Button render={<Link href="/dashboard/produk/baru" />}>
          <Plus className="size-4" />
          Produk baru
        </Button>
      </div>
      <ProductList />
    </div>
  );
};

export default ProductsPage;
