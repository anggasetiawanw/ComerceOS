import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';

export const useUsernameAvailability = (username: string, enabled: boolean) =>
  useQuery({
    queryKey: storeKeys.usernameAvailability(username),
    queryFn: () => storeApi.checkUsername(username),
    enabled,
    staleTime: 30_000,
  });
