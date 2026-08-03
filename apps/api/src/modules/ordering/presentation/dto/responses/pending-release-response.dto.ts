import { PendingReleaseListItem } from '../../../domain/repositories/order-read.repository';

export class PendingReleaseResponseDto {
  id!: string;
  orderNumber!: string;
  amount!: string;
  holdingUntil!: string;

  static fromItem(item: PendingReleaseListItem): PendingReleaseResponseDto {
    const dto = new PendingReleaseResponseDto();
    dto.id = item.id;
    dto.orderNumber = item.orderNumber;
    dto.amount = item.amount;
    dto.holdingUntil = item.holdingUntil.toISOString();
    return dto;
  }
}
