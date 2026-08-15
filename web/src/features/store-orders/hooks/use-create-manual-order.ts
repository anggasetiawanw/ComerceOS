import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storeOrderApi } from '../api/store-order.api';
import { storeOrderKeys } from '../api/store-order.keys';

export const useCreateManualOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeOrderApi.createManual,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeOrderKeys.all });
    },
  });
};
