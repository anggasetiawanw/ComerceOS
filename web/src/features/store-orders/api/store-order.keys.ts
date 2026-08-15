import type { StoreOrderListQuery } from '../types/store-order.types';

export const storeOrderKeys = {
  all: ['store-orders'] as const,
  list: (query: StoreOrderListQuery) => [...storeOrderKeys.all, 'list', query] as const,
  detail: (id: string) => [...storeOrderKeys.all, 'detail', id] as const,
};
