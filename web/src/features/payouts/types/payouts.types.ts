export interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export type WithdrawalStatus = 'requested' | 'approved' | 'paid' | 'rejected';

export interface Withdrawal {
  id: string;
  storeId: string;
  amount: string;
  status: WithdrawalStatus;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
  adminNote: string | null;
}
