import { StoreBuyerRow } from '../../../domain/repositories/store-buyer-read.repository';

export class StoreBuyerResponseDto {
  id!: string;
  buyerName!: string;
  buyerEmail!: string;
  buyerAvatarUrl!: string | null;
  firstPurchaseAt!: string;
  lastPurchaseAt!: string;
  totalOrders!: number;
  totalSpent!: string;
  tags!: string[];

  static fromRow(row: StoreBuyerRow): StoreBuyerResponseDto {
    const dto = new StoreBuyerResponseDto();
    dto.id = row.id;
    dto.buyerName = row.buyerName;
    dto.buyerEmail = row.buyerEmail;
    dto.buyerAvatarUrl = row.buyerAvatarUrl;
    dto.firstPurchaseAt = row.firstPurchaseAt.toISOString();
    dto.lastPurchaseAt = row.lastPurchaseAt.toISOString();
    dto.totalOrders = row.totalOrders;
    dto.totalSpent = row.totalSpent;
    dto.tags = row.tags;
    return dto;
  }
}
