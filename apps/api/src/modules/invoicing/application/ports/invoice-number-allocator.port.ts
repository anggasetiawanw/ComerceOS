export const INVOICE_NUMBER_ALLOCATOR = Symbol('INVOICE_NUMBER_ALLOCATOR');

export interface InvoiceNumberAllocator {
  // Increments stores.invoice_counter under a row lock inside the caller's
  // transaction and returns the new value — never COUNT(*) + 1, never a
  // global sequence (.docs/03-bounded-contexts.md §3.7).
  allocate(storeId: string): Promise<number>;
}
