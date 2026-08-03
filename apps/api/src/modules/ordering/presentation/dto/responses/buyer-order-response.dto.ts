import { BuyerOrderListItem } from '../../../domain/repositories/order-read.repository';

export class BuyerOrderListItemResponseDto {
  id!: string;
  orderNumber!: string;
  storeId!: string;
  storeName!: string;
  status!: string;
  total!: string;
  createdAt!: Date;

  static fromReadModel(item: BuyerOrderListItem): BuyerOrderListItemResponseDto {
    const dto = new BuyerOrderListItemResponseDto();
    dto.id = item.id;
    dto.orderNumber = item.orderNumber;
    dto.storeId = item.storeId;
    dto.storeName = item.storeName;
    dto.status = item.status;
    dto.total = item.total;
    dto.createdAt = item.createdAt;
    return dto;
  }
}
