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

// Read-only, bypasses the domain — flat rows for lists, not aggregates
// (.docs/04-entity-design.md §4). Offset paginated: buyer order volume is
// inherently small even across many sellers, so cursor pagination (used for
// the seller-facing /orders list, deferred this sprint) is not worth a
// second pagination contract for one low-traffic endpoint.
export interface OrderReadRepository {
  listForBuyer(buyerId: string, params: { page: number; limit: number }): Promise<BuyerOrderListResult>;
}
