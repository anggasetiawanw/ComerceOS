export type StoreBuyerSort = 'recent' | 'total_spent' | 'total_orders';

export interface StoreBuyer {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerAvatarUrl: string | null;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  totalOrders: number;
  totalSpent: string;
  tags: string[];
}
