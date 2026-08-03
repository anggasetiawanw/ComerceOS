export const ORDER_READ_REPOSITORY = Symbol('ORDER_READ_REPOSITORY');

export interface BuyerOrderListItem {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  status: string;
  total: string;
  createdAt: Date;
}

export interface BuyerOrderListResult {
  items: BuyerOrderListItem[];
  total: number;
}

export interface PendingReleaseListItem {
  id: string;
  orderNumber: string;
  amount: string;
  holdingUntil: Date;
}

// Read-only, bypasses the domain — flat rows for lists, not aggregates
// (.docs/04-entity-design.md §4). Offset paginated: buyer order volume is
// inherently small even across many sellers, so cursor pagination (used for
// the seller-facing /orders list, deferred this sprint) is not worth a
// second pagination contract for one low-traffic endpoint. The pending-release
// queue is scoped to one store's holding orders, which is smaller still, so
// it follows the same reasoning rather than the cursor contract used for
// /balance/transactions and /buyers.
export interface OrderReadRepository {
  listForBuyer(buyerId: string, params: { page: number; limit: number }): Promise<BuyerOrderListResult>;
  listPendingRelease(storeId: string, params: { page: number; limit: number }): Promise<{ items: PendingReleaseListItem[]; total: number }>;
  // Sprint 7 — the withdrawal-request validation rule ".docs/09 §7's "no
  // unresolved dispute on orders contributing to the balance".
  existsDisputedForStore(storeId: string): Promise<boolean>;
}
