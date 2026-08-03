export const STORE_BUYER_READ_REPOSITORY = Symbol('STORE_BUYER_READ_REPOSITORY');

export type StoreBuyerSort = 'recent' | 'total_spent' | 'total_orders';

export interface StoreBuyerRow {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerAvatarUrl: string | null;
  firstPurchaseAt: Date;
  lastPurchaseAt: Date;
  totalOrders: number;
  totalSpent: string;
  tags: string[];
}

// Every method here is scoped by storeId — the isolation rule is a product
// promise, not a technicality (.docs/03-bounded-contexts.md §3.9): seller A
// must never learn that their buyer also shops at store B. The response
// row's `id` is the store_buyers row id, never `users.id` — the CRM API
// never returns a global users row.
export interface StoreBuyerReadRepository {
  listByStore(params: {
    storeId: string;
    search?: string;
    sort: StoreBuyerSort;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: StoreBuyerRow[]; hasMore: boolean }>;
}
