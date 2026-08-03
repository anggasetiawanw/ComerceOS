import { apiClient } from '@/lib/api/client';
import type { Order } from '@/features/orders/types/order.types';
import type { CheckoutCreateResult, CheckoutItemInput, CheckoutQuote, SnapTransaction } from '../types/checkout.types';

export const checkoutApi = {
  quote: (items: CheckoutItemInput[]): Promise<CheckoutQuote> => apiClient.post<CheckoutQuote>('/checkout/quote', { items }),
  create: (items: CheckoutItemInput[]): Promise<CheckoutCreateResult> =>
    apiClient.post<CheckoutCreateResult>(
      '/checkout',
      { items },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    ),
  status: (orderNumber: string): Promise<Order> => apiClient.get<Order>(`/checkout/${orderNumber}/status`),
  reissueSnapToken: (orderId: string): Promise<SnapTransaction> =>
    apiClient.post<SnapTransaction>(`/payments/orders/${orderId}/snap-token`),
  // Dev-only: drives the stub Snap gateway's order through the real webhook
  // pipeline. The API 404s this outside development or once real Midtrans
  // keys are configured.
  simulatePayment: (orderNumber: string): Promise<{ received: boolean }> =>
    apiClient.post<{ received: boolean }>('/payments/dev/simulate-webhook', { orderNumber }),
};
