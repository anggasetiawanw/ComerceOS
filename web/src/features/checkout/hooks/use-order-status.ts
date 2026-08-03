import { useQuery } from '@tanstack/react-query';
import { checkoutApi } from '../api/checkout.api';
import { checkoutKeys } from '../api/checkout.keys';

const POLL_INTERVAL_MS = 3_000;

export const useOrderStatus = (orderNumber: string) =>
  useQuery({
    queryKey: checkoutKeys.status(orderNumber),
    queryFn: () => checkoutApi.status(orderNumber),
    enabled: orderNumber.length > 0,
    refetchInterval: (query) => (query.state.data?.status === 'pending_payment' ? POLL_INTERVAL_MS : false),
  });
