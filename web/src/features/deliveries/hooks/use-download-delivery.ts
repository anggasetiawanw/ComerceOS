import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../api/delivery.api';
import { deliveryKeys } from '../api/delivery.keys';

export const useDownloadDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deliveryApi.download(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.list() });
    },
  });
};
