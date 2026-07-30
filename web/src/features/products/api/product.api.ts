import { apiClient, type PaginatedResult } from '@/lib/api/client';
import { uploadFile } from '@/lib/api/upload';
import type { DigitalFile, Product, ProductListQuery } from '../types/product.types';

export interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  price: string;
  hpp?: string | null;
  productType: string;
  stock?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  price?: string;
  hpp?: string | null;
  stock?: number | null;
}

const buildListQuery = (query: ProductListQuery): string => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 20));
  return params.toString();
};

export const productApi = {
  list: (query: ProductListQuery = {}): Promise<PaginatedResult<Product>> =>
    apiClient.getPaginated<Product>(`/products?${buildListQuery(query)}`),
  getById: (id: string): Promise<Product> => apiClient.get<Product>(`/products/${id}`),
  create: (input: CreateProductInput): Promise<Product> => apiClient.post<Product>('/products', input),
  update: (id: string, input: UpdateProductInput): Promise<Product> =>
    apiClient.patch<Product>(`/products/${id}`, input),
  publish: (id: string): Promise<Product> => apiClient.post<Product>(`/products/${id}/publish`),
  archive: (id: string): Promise<Product> => apiClient.post<Product>(`/products/${id}/archive`),
  uploadImage: (id: string, file: File, onProgress?: (percent: number) => void): Promise<Product> =>
    uploadFile<Product>(`/products/${id}/images`, file, onProgress),
  removeImage: (id: string, imageId: string): Promise<Product> =>
    apiClient.delete<Product>(`/products/${id}/images/${imageId}`),
  listFiles: (id: string): Promise<DigitalFile[]> => apiClient.get<DigitalFile[]>(`/products/${id}/files`),
  uploadFile: (id: string, file: File, onProgress?: (percent: number) => void): Promise<DigitalFile> =>
    uploadFile<DigitalFile>(`/products/${id}/files`, file, onProgress),
  removeFile: (id: string, fileId: string): Promise<void> =>
    apiClient.delete<void>(`/products/${id}/files/${fileId}`),
};
