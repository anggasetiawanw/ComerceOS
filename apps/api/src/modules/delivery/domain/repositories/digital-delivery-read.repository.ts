export const DIGITAL_DELIVERY_READ_REPOSITORY = Symbol('DIGITAL_DELIVERY_READ_REPOSITORY');

export interface BuyerDeliveryListItem {
  id: string;
  orderItemId: string;
  productName: string;
  fileName: string | null;
  storeId: string;
  storeName: string;
  orderNumber: string;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: Date;
}

export interface DigitalDeliveryReadRepository {
  listForBuyer(buyerId: string): Promise<BuyerDeliveryListItem[]>;
}
