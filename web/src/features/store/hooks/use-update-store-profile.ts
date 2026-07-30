import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';

export const useUpdateStoreProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storeApi.updateProfile,
    onSuccess: (store) => {
      queryClient.setQueryData(storeKeys.me(), store);
    },
  });
};
