export const PRODUCT_TYPES = ['digital', 'physical', 'service'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface ProductImage {
  id: string;
  url: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  hpp: string | null;
  productType: ProductType;
  stock: number | null;
  status: ProductStatus;
  images: ProductImage[];
  digitalFileCount: number;
  createdAt: string;
}

export interface DigitalFile {
  id: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  maxDownloads: number;
  createdAt: string;
}

export interface ProductListQuery {
  status?: ProductStatus;
  page?: number;
  limit?: number;
}
