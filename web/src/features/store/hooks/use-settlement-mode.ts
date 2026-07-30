import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';

export const useStoreSettings = () =>
  useQuery({
    queryKey: storeKeys.settings(),
    queryFn: storeApi.getSettings,
  });

export const useChangeSettlementMode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storeApi.changeSettlementMode,
    onSuccess: (settings) => {
      queryClient.setQueryData(storeKeys.settings(), settings);
      queryClient.invalidateQueries({ queryKey: storeKeys.me() });
    },
  });
};
