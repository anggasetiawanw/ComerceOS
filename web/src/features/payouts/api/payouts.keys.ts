import type { ListWithdrawalsQuery } from './payouts.api';

export const payoutsKeys = {
  all: ['payouts'] as const,
  bankAccounts: () => [...payoutsKeys.all, 'bank-accounts'] as const,
  withdrawals: (query: ListWithdrawalsQuery) => [...payoutsKeys.all, 'withdrawals', query] as const,
};
