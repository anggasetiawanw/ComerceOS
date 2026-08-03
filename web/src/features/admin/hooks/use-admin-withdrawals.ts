import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ListAdminWithdrawalsQuery } from '../api/admin.api';
import { adminKeys } from '../api/admin.keys';

export const useAdminWithdrawals = (query: ListAdminWithdrawalsQuery = {}) =>
  useQuery({
    queryKey: adminKeys.withdrawals(query),
    queryFn: () => adminApi.listWithdrawals(query),
  });

const useInvalidateAdminWithdrawals = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };
};

export const useApproveWithdrawal = () => {
  const invalidate = useInvalidateAdminWithdrawals();
  return useMutation({
    mutationFn: adminApi.approveWithdrawal,
    onSuccess: invalidate,
  });
};

export const useRejectWithdrawal = () => {
  const invalidate = useInvalidateAdminWithdrawals();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminApi.rejectWithdrawal(id, reason),
    onSuccess: invalidate,
  });
};

export const useMarkWithdrawalPaid = () => {
  const invalidate = useInvalidateAdminWithdrawals();
  return useMutation({
    mutationFn: adminApi.markWithdrawalPaid,
    onSuccess: invalidate,
  });
};
