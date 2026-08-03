import { apiClient, type CursorResult } from '@/lib/api/client';
import type { BankAccount, Withdrawal } from '../types/payouts.types';

export interface ListWithdrawalsQuery {
  cursor?: string;
  limit?: number;
}

export const payoutsApi = {
  listBankAccounts: (): Promise<BankAccount[]> => apiClient.get<BankAccount[]>('/bank-accounts'),
  addBankAccount: (input: {
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
    makeDefault?: boolean;
  }): Promise<BankAccount> => apiClient.post<BankAccount>('/bank-accounts', input),
  setDefaultBankAccount: (id: string): Promise<{ updated: true }> =>
    apiClient.patch<{ updated: true }>(`/bank-accounts/${id}/default`),
  removeBankAccount: (id: string): Promise<{ removed: true }> =>
    apiClient.delete<{ removed: true }>(`/bank-accounts/${id}`),

  listWithdrawals: (query: ListWithdrawalsQuery = {}): Promise<CursorResult<Withdrawal>> => {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    params.set('limit', String(query.limit ?? 20));
    return apiClient.getCursorPaginated<Withdrawal>(`/withdrawals?${params.toString()}`);
  },
  requestWithdrawal: (amount: number): Promise<Withdrawal> =>
    apiClient.post<Withdrawal>('/withdrawals', { amount }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
};
