export const BUYER_DIRECTORY = Symbol('BUYER_DIRECTORY');

export interface BuyerDirectoryEntry {
  id: string;
  name: string;
  email: string;
}

// Owned by ordering (the consumer), implemented by identity — same
// dependency-inversion direction as PAYMENT_GATEWAY and identity's own
// STORE_LOOKUP. A manual order needs a buyer_id (orders.buyer_id is
// NOT NULL, RESTRICT FK), but a Path B buyer typically has never
// registered — findOrCreateByEmail returns an existing account when the
// email matches one, or registers a passwordless guest buyer otherwise.
// The guest claims the account later via /lupa-password.
export interface BuyerDirectory {
  findOrCreateByEmail(params: { email: string; name: string; phone: string | null }): Promise<BuyerDirectoryEntry>;
}
