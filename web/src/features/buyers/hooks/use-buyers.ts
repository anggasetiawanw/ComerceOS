import { useQuery } from '@tanstack/react-query';
import { buyerApi, type ListBuyersQuery } from '../api/buyer.api';
import { buyerKeys } from '../api/buyer.keys';

export const useBuyers = (query: ListBuyersQuery = {}) =>
  useQuery({
    queryKey: buyerKeys.list(query),
    queryFn: () => buyerApi.list(query),
  });
