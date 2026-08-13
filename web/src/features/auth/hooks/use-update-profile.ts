import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../api/auth.keys';

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
};
