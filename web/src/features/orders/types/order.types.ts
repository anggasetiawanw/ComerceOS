export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'holding'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled'
  | 'expired';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  price: string;
  qty: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  status: OrderStatus;
  subtotal: string;
  discountAmount: string;
  total: string;
  feeAmount: string;
  paymentMethod: string | null;
  paidAt: string | null;
  holdingUntil: string | null;
  items: OrderItem[];
  createdAt: string;
}

export interface BuyerOrderListItem {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
}
