import Link from 'next/link';
import { MoneyDisplay } from '@/components/data/money-display';
import { ProductTypeBadge } from '@/components/data/product-type-badge';
import type { StorefrontProduct } from '../types/storefront.types';

export const ProductCard = ({ username, product }: { username: string; product: StorefrontProduct }) => (
  <Link
    href={`/@${username}/produk/${product.slug}`}
    className="flex flex-col overflow-hidden rounded-lg border transition-colors hover:bg-muted/50"
  >
    <div className="aspect-square w-full bg-muted">
      {product.imageUrls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrls[0]} alt={product.name} className="size-full object-cover" />
      )}
    </div>
    <div className="flex flex-col gap-1 p-3">
      <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
      <div className="flex items-center justify-between gap-2">
        <MoneyDisplay value={product.price} className="text-sm font-semibold" />
        <ProductTypeBadge productType={product.productType} />
      </div>
    </div>
  </Link>
);
