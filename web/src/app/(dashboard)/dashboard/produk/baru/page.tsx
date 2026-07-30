'use client';

import { ProductForm } from '@/features/products/components/product-form';

const NewProductPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Produk baru</h1>
        <p className="text-sm text-muted-foreground">
          Isi detail produk. Gambar dan berkas digital bisa ditambahkan setelah produk dibuat.
        </p>
      </div>
      <ProductForm />
    </div>
  );
};

export default NewProductPage;
