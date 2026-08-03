import { useQuery } from '@tanstack/react-query';
import { financeApi, type ListTransactionsQuery } from '../api/finance.api';
import { financeKeys } from '../api/finance.keys';

export const useLedgerTransactions = (query: ListTransactionsQuery = {}) =>
  useQuery({
    queryKey: financeKeys.transactions(query),
    queryFn: () => financeApi.listTransactions(query),
  });
