import { BuyerDeliveryListItem } from '../../../domain/repositories/digital-delivery-read.repository';

export class BuyerDeliveryResponseDto {
  id!: string;
  orderItemId!: string;
  productName!: string;
  fileName!: string | null;
  storeId!: string;
  storeName!: string;
  orderNumber!: string;
  downloadCount!: number;
  maxDownloads!: number;
  expiresAt!: Date;

  static fromReadModel(item: BuyerDeliveryListItem): BuyerDeliveryResponseDto {
    const dto = new BuyerDeliveryResponseDto();
    dto.id = item.id;
    dto.orderItemId = item.orderItemId;
    dto.productName = item.productName;
    dto.fileName = item.fileName;
    dto.storeId = item.storeId;
    dto.storeName = item.storeName;
    dto.orderNumber = item.orderNumber;
    dto.downloadCount = item.downloadCount;
    dto.maxDownloads = item.maxDownloads;
    dto.expiresAt = item.expiresAt;
    return dto;
  }
}
