import type { ListBuyersQuery } from './buyer.api';

export const buyerKeys = {
  all: ['buyers'] as const,
  list: (query: ListBuyersQuery) => [...buyerKeys.all, 'list', query] as const,
};
