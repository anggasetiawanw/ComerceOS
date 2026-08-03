export interface BuyerDelivery {
  id: string;
  orderItemId: string;
  productName: string;
  fileName: string | null;
  storeId: string;
  storeName: string;
  orderNumber: string;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: string;
}

export interface DownloadUrlResult {
  url: string;
  fileName: string;
}
