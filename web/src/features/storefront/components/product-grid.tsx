import type { StorefrontProduct } from '../types/storefront.types';
import { StorefrontEmpty } from './storefront-empty';
import { ProductCard } from './product-card';

interface ProductGridProps {
  username: string;
  products: StorefrontProduct[];
}

export const ProductGrid = ({ username, products }: ProductGridProps) => {
  if (products.length === 0) {
    return <StorefrontEmpty />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} username={username} product={product} />
      ))}
    </div>
  );
};
