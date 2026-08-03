import { Order } from '../../../domain/entities/order.aggregate';

export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  productName!: string;
  productType!: string;
  price!: string;
  qty!: number;
}

export class OrderResponseDto {
  id!: string;
  orderNumber!: string;
  storeId!: string;
  status!: string;
  subtotal!: string;
  discountAmount!: string;
  total!: string;
  feeAmount!: string;
  paymentMethod!: string | null;
  paidAt!: Date | null;
  holdingUntil!: Date | null;
  items!: OrderItemResponseDto[];
  createdAt!: Date;

  static fromDomain(order: Order): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.orderNumber = order.orderNumber.value;
    dto.storeId = order.storeId;
    dto.status = order.status.value;
    dto.subtotal = order.subtotal.toString();
    dto.discountAmount = order.discount.amount.toString();
    dto.total = order.total.toString();
    dto.feeAmount = order.fee.amount.toString();
    dto.paymentMethod = order.paymentMethod;
    dto.paidAt = order.paidAt;
    dto.holdingUntil = order.holdingUntil;
    dto.items = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      productType: item.productTypeSnapshot,
      price: item.priceSnapshot.toString(),
      qty: item.qty,
    }));
    dto.createdAt = order.createdAt;
    return dto;
  }
}
