import type { BuyerOrderListQuery } from './order.api';

export const orderKeys = {
  all: ['orders'] as const,
  list: (query: BuyerOrderListQuery) => [...orderKeys.all, 'list', query] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};
