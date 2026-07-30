'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { MoneyInput } from '@/components/forms/money-input';
import { ApiError } from '@/lib/api/client';
import { useCreateProduct } from '../hooks/use-create-product';
import { useUpdateProduct } from '../hooks/use-update-product';
import { productFormSchema, type ProductFormInput } from '../schemas/product.schemas';
import { PRODUCT_TYPES, type Product } from '../types/product.types';

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  digital: 'Digital',
  physical: 'Fisik',
  service: 'Jasa',
};

export const ProductForm = ({ product }: { product?: Product }) => {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      description: product?.description ?? '',
      price: product?.price ?? '',
      hpp: product?.hpp ?? '',
      productType: product?.productType ?? 'digital',
      stock: product?.stock !== undefined && product?.stock !== null ? String(product.stock) : '',
    },
  });

  const price = watch('price');
  const hpp = watch('hpp');
  const productType = watch('productType');

  const onSubmit = async (values: ProductFormInput) => {
    setFormError(null);

    try {
      if (product) {
        await updateProduct.mutateAsync({
          name: values.name,
          slug: values.slug || undefined,
          description: values.description || null,
          price: values.price,
          hpp: values.hpp || null,
          stock: values.stock ? Number(values.stock) : null,
        });
      } else {
        const created = await createProduct.mutateAsync({
          name: values.name,
          slug: values.slug || undefined,
          description: values.description || null,
          price: values.price,
          hpp: values.hpp || null,
          productType: values.productType,
          stock: values.stock ? Number(values.stock) : null,
        });
        router.push(`/dashboard/produk/${created.id}`);
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FormField label="Nama produk" htmlFor="name" error={errors.name}>
        <Input id="name" {...register('name')} />
      </FormField>
      <FormField label="Slug (opsional)" htmlFor="slug" error={errors.slug}>
        <Input id="slug" placeholder="dibuat otomatis dari nama jika kosong" {...register('slug')} />
      </FormField>
      <FormField label="Deskripsi" htmlFor="description" error={errors.description}>
        <Textarea id="description" rows={4} {...register('description')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Harga" htmlFor="price" error={errors.price}>
          <MoneyInput id="price" value={price} onChange={(digits) => setValue('price', digits)} />
        </FormField>
        <FormField label="HPP (opsional)" htmlFor="hpp" error={errors.hpp}>
          <MoneyInput id="hpp" value={hpp ?? ''} onChange={(digits) => setValue('hpp', digits)} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Jenis produk" htmlFor="productType" error={errors.productType}>
          <Select
            value={productType}
            onValueChange={(value) => setValue('productType', value as typeof productType)}
            disabled={Boolean(product)}
          >
            <SelectTrigger id="productType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PRODUCT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Stok (kosongkan jika tak terbatas)" htmlFor="stock" error={errors.stock}>
          <Input id="stock" inputMode="numeric" {...register('stock')} />
        </FormField>
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {product ? 'Simpan perubahan' : 'Buat produk'}
      </Button>
    </form>
  );
};
