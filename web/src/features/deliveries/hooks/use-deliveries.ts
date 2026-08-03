import { useQuery } from '@tanstack/react-query';
import { deliveryApi } from '../api/delivery.api';
import { deliveryKeys } from '../api/delivery.keys';

export const useDeliveries = () =>
  useQuery({
    queryKey: deliveryKeys.list(),
    queryFn: deliveryApi.list,
  });
