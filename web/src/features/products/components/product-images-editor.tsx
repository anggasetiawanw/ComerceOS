'use client';

import { Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ImageUploader } from '@/components/forms/image-uploader';
import { productKeys } from '../api/product.keys';
import { useRemoveProductImage } from '../hooks/use-product-images';
import type { Product } from '../types/product.types';

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCT_IMAGES = 8;

export const ProductImagesEditor = ({ product }: { product: Product }) => {
  const queryClient = useQueryClient();
  const remove = useRemoveProductImage(product.id);

  return (
    <div className="flex flex-col gap-4">
      {product.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {product.images.map((image) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="size-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute top-1 right-1"
                aria-label="Hapus gambar"
                disabled={remove.isPending && remove.variables === image.id}
                onClick={() => remove.mutate(image.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {product.images.length < MAX_PRODUCT_IMAGES && (
        <ImageUploader<Product>
          label="Tambah gambar"
          endpoint={`/products/${product.id}/images`}
          maxBytes={MAX_PRODUCT_IMAGE_BYTES}
          currentUrl={null}
          aspectClassName="aspect-square w-32 rounded-md"
          onUploaded={(updated) => queryClient.setQueryData(productKeys.detail(product.id), updated)}
        />
      )}
    </div>
  );
};
