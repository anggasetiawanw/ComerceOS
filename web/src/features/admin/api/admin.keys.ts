import type { ListAdminWithdrawalsQuery } from './admin.api';

export const adminKeys = {
  all: ['admin'] as const,
  metrics: () => [...adminKeys.all, 'metrics'] as const,
  withdrawals: (query: ListAdminWithdrawalsQuery) => [...adminKeys.all, 'withdrawals', query] as const,
};
