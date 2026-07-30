'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoneyDisplay } from '@/components/data/money-display';
import { ProductTypeBadge } from '@/components/data/product-type-badge';
import { usePublishProduct } from '../hooks/use-publish-product';
import { ProductStatusBadge } from './product-status-badge';
import { ArchiveProductDialog } from './archive-product-dialog';
import type { Product } from '../types/product.types';

export const ProductRowCard = ({ product }: { product: Product }) => {
  const publish = usePublishProduct();
  const canPublish = product.status === 'draft' || product.status === 'archived';
  const isPublishing = publish.isPending && publish.variables === product.id;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.name}
              className="size-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="size-12 shrink-0 rounded-md bg-muted" />
          )}
          <div className="flex flex-col gap-1">
            <p className="font-medium">{product.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <MoneyDisplay value={product.price} />
              <ProductTypeBadge productType={product.productType} />
              <ProductStatusBadge status={product.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/produk/${product.id}`} />}>
            Edit
          </Button>
          {canPublish && (
            <Button size="sm" disabled={isPublishing} onClick={() => publish.mutate(product.id)}>
              {isPublishing ? <Loader2 className="size-3.5 animate-spin" /> : 'Terbitkan'}
            </Button>
          )}
          {product.status !== 'archived' && (
            <ArchiveProductDialog productId={product.id} productName={product.name} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
