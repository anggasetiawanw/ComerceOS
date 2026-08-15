import { Order } from '../../../domain/entities/order.aggregate';
import { OrderItemResponseDto } from './order-response.dto';

export class OrderStatusHistoryResponseDto {
  fromStatus!: string | null;
  toStatus!: string;
  actorType!: string;
  actorId!: string | null;
  reason!: string | null;
  createdAt!: Date;
}

export class OrderDetailResponseDto {
  id!: string;
  orderNumber!: string;
  storeId!: string;
  source!: string;
  inquiryId!: string | null;
  status!: string;
  subtotal!: string;
  discountAmount!: string;
  total!: string;
  feeAmount!: string;
  paymentMethod!: string | null;
  paidAt!: Date | null;
  holdingUntil!: Date | null;
  releasedAt!: Date | null;
  buyerId!: string;
  buyerName!: string | null;
  buyerEmail!: string | null;
  items!: OrderItemResponseDto[];
  statusHistory!: OrderStatusHistoryResponseDto[];
  createdAt!: Date;

  static fromDomain(order: Order, buyer?: { name: string; email: string } | null): OrderDetailResponseDto {
    const dto = new OrderDetailResponseDto();
    dto.id = order.id;
    dto.orderNumber = order.orderNumber.value;
    dto.storeId = order.storeId;
    dto.source = order.source.value;
    dto.inquiryId = order.inquiryId;
    dto.status = order.status.value;
    dto.subtotal = order.subtotal.toString();
    dto.discountAmount = order.discount.amount.toString();
    dto.total = order.total.toString();
    dto.feeAmount = order.fee.amount.toString();
    dto.paymentMethod = order.paymentMethod;
    dto.paidAt = order.paidAt;
    dto.holdingUntil = order.holdingUntil;
    dto.releasedAt = order.releasedAt;
    dto.buyerId = order.buyerId;
    dto.buyerName = buyer?.name ?? null;
    dto.buyerEmail = buyer?.email ?? null;
    dto.items = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      productType: item.productTypeSnapshot,
      price: item.priceSnapshot.toString(),
      qty: item.qty,
    }));
    dto.statusHistory = order.statusHistory.map((entry) => ({
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorType: entry.actor.type,
      actorId: entry.actor.id,
      reason: entry.reason,
      createdAt: entry.createdAt,
    }));
    dto.createdAt = order.createdAt;
    return dto;
  }
}
