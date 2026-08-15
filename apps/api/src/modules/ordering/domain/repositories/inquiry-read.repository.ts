export const INQUIRY_READ_REPOSITORY = Symbol('INQUIRY_READ_REPOSITORY');

export interface InquiryListItem {
  id: string;
  status: string;
  productId: string | null;
  productName: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  createdAt: Date;
}

// Read-only, bypasses the domain — same "flat rows for lists" precedent as
// OrderReadRepository. Offset paginated: per-store inquiry volume is
// inherently small, the same reasoning that kept the buyer order list and
// pending-release queue on offset pagination rather than cursor.
export interface InquiryReadRepository {
  listByStore(
    storeId: string,
    params: { status?: string; page: number; limit: number },
  ): Promise<{ items: InquiryListItem[]; total: number }>;
}
