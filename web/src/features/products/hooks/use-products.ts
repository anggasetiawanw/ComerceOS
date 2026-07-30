import { useQuery } from '@tanstack/react-query';
import { productApi } from '../api/product.api';
import { productKeys } from '../api/product.keys';
import type { ProductListQuery } from '../types/product.types';

export const useProducts = (query: ProductListQuery = {}) =>
  useQuery({
    queryKey: productKeys.list(query),
    queryFn: () => productApi.list(query),
  });
