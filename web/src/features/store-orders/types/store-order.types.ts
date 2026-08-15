import type { OrderStatus } from '@/features/orders/types/order.types';

export type OrderSource = 'self_checkout' | 'manual';

export interface StoreOrderListItem {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  buyerName: string;
  buyerEmail: string;
  total: string;
  createdAt: string;
}

export interface StoreOrderStatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: 'system' | 'seller' | 'buyer' | 'admin';
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface StoreOrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  price: string;
  qty: number;
}

export interface StoreOrderDetail {
  id: string;
  orderNumber: string;
  storeId: string;
  source: OrderSource;
  inquiryId: string | null;
  status: OrderStatus;
  subtotal: string;
  discountAmount: string;
  total: string;
  feeAmount: string;
  paymentMethod: string | null;
  paidAt: string | null;
  holdingUntil: string | null;
  releasedAt: string | null;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  items: StoreOrderItem[];
  statusHistory: StoreOrderStatusHistoryEntry[];
  createdAt: string;
}

export interface StoreOrderListQuery {
  status?: OrderStatus;
  source?: OrderSource;
  createdFrom?: string;
  createdTo?: string;
  buyerSearch?: string;
  cursor?: string;
  limit?: number;
}
