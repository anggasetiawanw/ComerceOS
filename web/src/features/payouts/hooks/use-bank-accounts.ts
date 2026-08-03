import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payoutsApi } from '../api/payouts.api';
import { payoutsKeys } from '../api/payouts.keys';

export const useBankAccounts = () =>
  useQuery({
    queryKey: payoutsKeys.bankAccounts(),
    queryFn: payoutsApi.listBankAccounts,
  });

export const useAddBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payoutsApi.addBankAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutsKeys.bankAccounts() }),
  });
};

export const useSetDefaultBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payoutsApi.setDefaultBankAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutsKeys.bankAccounts() }),
  });
};

export const useRemoveBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payoutsApi.removeBankAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutsKeys.bankAccounts() }),
  });
};
