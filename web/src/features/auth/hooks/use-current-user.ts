import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../api/auth.keys';

export const useCurrentUser = () =>
  useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
  });
