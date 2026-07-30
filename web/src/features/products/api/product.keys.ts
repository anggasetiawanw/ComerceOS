import type { ProductListQuery } from '../types/product.types';

export const productKeys = {
  all: ['products'] as const,
  list: (query: ProductListQuery) => [...productKeys.all, 'list', query] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  files: (id: string) => [...productKeys.all, 'files', id] as const,
};
