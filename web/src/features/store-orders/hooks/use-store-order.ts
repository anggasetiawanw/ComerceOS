import { useQuery } from '@tanstack/react-query';
import { storeOrderApi } from '../api/store-order.api';
import { storeOrderKeys } from '../api/store-order.keys';

export const useStoreOrder = (id: string) =>
  useQuery({
    queryKey: storeOrderKeys.detail(id),
    queryFn: () => storeOrderApi.getById(id),
  });
