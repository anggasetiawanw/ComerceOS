import { StoreOrderListItem } from '../../../domain/repositories/order-read.repository';

export class StoreOrderListResponseDto {
  id!: string;
  orderNumber!: string;
  source!: string;
  status!: string;
  buyerName!: string;
  buyerEmail!: string;
  total!: string;
  createdAt!: Date;

  static fromItem(item: StoreOrderListItem): StoreOrderListResponseDto {
    const dto = new StoreOrderListResponseDto();
    dto.id = item.id;
    dto.orderNumber = item.orderNumber;
    dto.source = item.source;
    dto.status = item.status;
    dto.buyerName = item.buyerName;
    dto.buyerEmail = item.buyerEmail;
    dto.total = item.total;
    dto.createdAt = item.createdAt;
    return dto;
  }
}
