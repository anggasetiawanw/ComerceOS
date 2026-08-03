export interface InvoiceViewModelItem {
  name: string;
  qty: number;
  priceRupiah: string;
  subtotalRupiah: string;
}

export interface InvoiceViewModel {
  invoiceNumber: string;
  issuedAtIso: string;
  store: {
    displayName: string;
    username: string;
  };
  buyer: {
    name: string;
    email: string;
  };
  order: {
    orderNumber: string;
    paidAtIso: string | null;
  };
  items: InvoiceViewModelItem[];
  subtotalRupiah: string;
  discountRupiah: string;
  totalRupiah: string;
}
