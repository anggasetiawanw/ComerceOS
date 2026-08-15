import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storeOrderApi } from '../api/store-order.api';
import { storeOrderKeys } from '../api/store-order.keys';

// Shared by confirm-payment/cancel/release — all three just transition an
// existing order and only need the detail + list caches invalidated.
const useOrderTransition = (mutationFn: (id: string) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: storeOrderKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: storeOrderKeys.all });
    },
  });
};

export const useConfirmPayment = () => useOrderTransition(storeOrderApi.confirmPayment);
export const useCancelOrder = () => useOrderTransition(storeOrderApi.cancel);
export const useReleaseOrder = () => useOrderTransition(storeOrderApi.release);
