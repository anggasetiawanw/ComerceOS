import { useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshAccessToken } from '@/lib/auth/refresh';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';
import { authKeys } from '@/features/auth/api/auth.keys';

export const useCreateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storeApi.create,
    onSuccess: async () => {
      await refreshAccessToken();
      await queryClient.invalidateQueries({ queryKey: storeKeys.me() });
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
};
