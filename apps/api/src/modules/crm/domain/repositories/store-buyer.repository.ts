export const STORE_BUYER_REPOSITORY = Symbol('STORE_BUYER_REPOSITORY');

// No aggregate, no VOs — StoreBuyer is a read-oriented projection, not a
// domain entity with behavior (.docs/04-entity-design.md §9). The single
// write operation is a recompute, not a constructor + save.
export interface StoreBuyerRepository {
  // Recomputes first/last purchase + totals from `orders` for this
  // (storeId, buyerId) pair and upserts — never increments, so a replayed
  // OrderPaid cannot inflate lifetime spend. tags/notes are deliberately
  // untouched by this statement (.docs/09-payments-ledger.md §6 consumer
  // idempotency; .docs/03-bounded-contexts.md §3.9).
  upsertOnPurchase(storeId: string, buyerId: string): Promise<void>;
}
