'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/data/error-state';
import { useProduct } from '@/features/products/hooks/use-product';
import { ProductForm } from '@/features/products/components/product-form';
import { ProductImagesEditor } from '@/features/products/components/product-images-editor';
import { DigitalFilesEditor } from '@/features/products/components/digital-files-editor';
import { ProductsSkeleton } from '@/features/products/components/products-skeleton';

const ProductEditPage = () => {
  const params = useParams<{ id: string }>();
  const { data: product, isPending, isError, refetch } = useProduct(params.id);

  if (isPending) return <ProductsSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">Kelola detail, gambar, dan berkas produk.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail produk</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm product={product} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gambar produk</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductImagesEditor product={product} />
        </CardContent>
      </Card>

      {product.productType === 'digital' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Berkas digital</CardTitle>
          </CardHeader>
          <CardContent>
            <DigitalFilesEditor productId={product.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductEditPage;
