import type { Order } from '@/features/orders/types/order.types';

export interface CheckoutItemInput {
  productId: string;
  qty: number;
}

export interface CheckoutQuote {
  subtotal: string;
  discountAmount: string;
  total: string;
  feeAmount: string;
}

export interface CheckoutCreateResult {
  order: Order;
  snapToken: string | null;
  snapRedirectUrl: string | null;
}

export interface SnapTransaction {
  token: string;
  redirectUrl: string;
}

export const STUB_TOKEN_PREFIX = 'stub-';
