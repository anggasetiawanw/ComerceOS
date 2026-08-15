export type InquiryStatus = 'open' | 'converted' | 'lost';

export interface Inquiry {
  id: string;
  status: InquiryStatus;
  productId: string | null;
  productName: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  createdAt: string;
}

export interface CreateInquiryResult {
  inquiryId: string;
  waLink: string | null;
}
