import { Money } from '../../../../shared/kernel/value-objects/money.vo';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface SnapItemInput {
  id: string;
  name: string;
  price: Money;
  quantity: number;
}

export interface CreateSnapTransactionInput {
  orderNumber: string;
  grossAmount: Money;
  items: readonly SnapItemInput[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  expiryHours: number;
  finishRedirectUrl: string;
}

export interface SnapTransaction {
  token: string;
  redirectUrl: string;
}

// Owned by ordering (the consumer), implemented by the payments module —
// same dependency-inversion direction as identity's STORE_LOOKUP port.
// Anti-corruption boundary: Midtrans vocabulary never crosses this
// interface (.docs/09-payments-ledger.md §1).
export interface PaymentGateway {
  isConfigured(): boolean;
  createSnapTransaction(input: CreateSnapTransactionInput): Promise<SnapTransaction>;
}
