export const STORE_LOOKUP = Symbol('STORE_LOOKUP');

export interface StoreLookup {
  findStoreIdByOwner(userId: string): Promise<string | null>;
}
