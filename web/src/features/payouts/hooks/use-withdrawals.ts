import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeKeys } from '@/features/finance/api/finance.keys';
import { payoutsApi, type ListWithdrawalsQuery } from '../api/payouts.api';
import { payoutsKeys } from '../api/payouts.keys';

export const useWithdrawals = (query: ListWithdrawalsQuery = {}) =>
  useQuery({
    queryKey: payoutsKeys.withdrawals(query),
    queryFn: () => payoutsApi.listWithdrawals(query),
  });

export const useRequestWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payoutsApi.requestWithdrawal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: payoutsKeys.all });
      void queryClient.invalidateQueries({ queryKey: financeKeys.balance() });
    },
  });
};
