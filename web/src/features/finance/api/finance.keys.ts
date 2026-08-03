import type { ListTransactionsQuery } from './finance.api';

export const financeKeys = {
  all: ['finance'] as const,
  balance: () => [...financeKeys.all, 'balance'] as const,
  transactions: (query: ListTransactionsQuery) => [...financeKeys.all, 'transactions', query] as const,
};
