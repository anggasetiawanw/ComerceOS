import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../api/finance.api';
import { financeKeys } from '../api/finance.keys';

export const useBalance = () =>
  useQuery({
    queryKey: financeKeys.balance(),
    queryFn: financeApi.getBalance,
  });
