import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../api/store.api';
import { storeKeys } from '../api/store.keys';

export const useMyStore = () =>
  useQuery({
    queryKey: storeKeys.me(),
    queryFn: storeApi.getMine,
  });
