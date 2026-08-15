import { useQuery } from '@tanstack/react-query';
import { storeOrderApi } from '../api/store-order.api';
import { storeOrderKeys } from '../api/store-order.keys';
import type { StoreOrderListQuery } from '../types/store-order.types';

export const useStoreOrders = (query: StoreOrderListQuery = {}) =>
  useQuery({
    queryKey: storeOrderKeys.list(query),
    queryFn: () => storeOrderApi.list(query),
  });
