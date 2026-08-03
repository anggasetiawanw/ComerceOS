import { useQuery } from '@tanstack/react-query';
import { orderApi, type BuyerOrderListQuery } from '../api/order.api';
import { orderKeys } from '../api/order.keys';

export const useOrders = (query: BuyerOrderListQuery = {}) =>
  useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => orderApi.list(query),
  });
