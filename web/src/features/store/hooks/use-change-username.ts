import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';

export const useChangeUsername = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storeApi.changeUsername,
    onSuccess: (store) => {
      queryClient.setQueryData(storeKeys.me(), store);
    },
  });
};
