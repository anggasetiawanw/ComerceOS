import { Order as PrismaOrder, OrderItem as PrismaOrderItem, OrderStatusHistory as PrismaOrderStatusHistory, Prisma } from '@prisma/client';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { OrderStatusHistory } from '../../domain/entities/order-status-history.entity';
import { OrderNumber } from '../../domain/value-objects/order-number.vo';
import { OrderSource } from '../../domain/value-objects/order-source.vo';
import { OrderStatus, OrderStatusValue } from '../../domain/value-objects/order-status.vo';
import { PlatformFee } from '../../domain/value-objects/platform-fee.vo';
import { DiscountApplication } from '../../domain/value-objects/discount-application.vo';
import { StatusActorTypeValue, StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';

export type PrismaOrderWithRelations = PrismaOrder & {
  items: PrismaOrderItem[];
  statusHistory: PrismaOrderStatusHistory[];
};

export class OrderMapper {
  static toDomain(row: PrismaOrderWithRelations): Order {
    const orderNumberResult = OrderNumber.create(row.orderNumber);
    if (orderNumberResult.isErr()) {
      throw new Error(`Corrupt order row: invalid order number for order "${row.id}"`);
    }
    const sourceResult = OrderSource.create(row.source);
    if (sourceResult.isErr()) {
      throw new Error(`Corrupt order row: invalid source for order "${row.id}"`);
    }
    const statusResult = OrderStatus.create(row.status);
    if (statusResult.isErr()) {
      throw new Error(`Corrupt order row: invalid status for order "${row.id}"`);
    }
    const subtotalResult = Money.fromRupiah(row.subtotal);
    if (subtotalResult.isErr()) {
      throw new Error(`Corrupt order row: invalid subtotal for order "${row.id}"`);
    }
    const discountAmountResult = Money.fromRupiah(row.discountAmount);
    if (discountAmountResult.isErr()) {
      throw new Error(`Corrupt order row: invalid discount amount for order "${row.id}"`);
    }
    const totalResult = Money.fromRupiah(row.total);
    if (totalResult.isErr()) {
      throw new Error(`Corrupt order row: invalid total for order "${row.id}"`);
    }
    const feeAmountResult = Money.fromRupiah(row.platformFeeAmount);
    if (feeAmountResult.isErr()) {
      throw new Error(`Corrupt order row: invalid fee amount for order "${row.id}"`);
    }
    const feeResult = PlatformFee.fromRateDecimalString(row.platformFeeRate.toString(), feeAmountResult.unwrap());
    if (feeResult.isErr()) {
      throw new Error(`Corrupt order row: invalid fee rate for order "${row.id}"`);
    }

    const items = row.items
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => OrderMapper.itemToDomain(item));

    const statusHistory = row.statusHistory
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((entry) => OrderMapper.historyToDomain(entry));

    return Order.reconstitute(
      {
        orderNumber: orderNumberResult.unwrap(),
        storeId: row.storeId,
        buyerId: row.buyerId,
        source: sourceResult.unwrap(),
        inquiryId: row.inquiryId,
        status: statusResult.unwrap(),
        items,
        subtotal: subtotalResult.unwrap(),
        discount: row.discountCode
          ? DiscountApplication.of(row.discountCode, discountAmountResult.unwrap())
          : DiscountApplication.none(),
        total: totalResult.unwrap(),
        fee: feeResult.unwrap(),
        paymentMethod: row.paymentMethod,
        midtransTransactionId: row.midtransTransactionId,
        shippingAddress: (row.shippingAddress as Record<string, unknown> | null) ?? null,
        paidAt: row.paidAt,
        holdingUntil: row.holdingUntil,
        releasedAt: row.releasedAt,
        statusHistory,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(order: Order): Prisma.OrderUncheckedCreateInput {
    return {
      id: order.id,
      orderNumber: order.orderNumber.value,
      storeId: order.storeId,
      buyerId: order.buyerId,
      source: order.source.value,
      inquiryId: order.inquiryId,
      status: order.status.value,
      subtotal: order.subtotal.amount,
      discountCode: order.discount.code,
      discountAmount: order.discount.amount.amount,
      total: order.total.amount,
      platformFeeRate: order.fee.toRateDecimalString(),
      platformFeeAmount: order.fee.amount.amount,
      paymentMethod: order.paymentMethod,
      midtransTransactionId: order.midtransTransactionId,
      // Always null this sprint — no code path sets it (shipping capture is
      // Sprint 11's ShipOrder command). A real conversion arrives with a
      // ShippingAddress VO at that point, matching the ProductImages.toJSON() precedent.
      shippingAddress: Prisma.JsonNull,
      paidAt: order.paidAt,
      holdingUntil: order.holdingUntil,
      releasedAt: order.releasedAt,
      createdAt: order.createdAt,
    };
  }

  // id/storeId/buyerId/orderNumber/source/subtotal/discount/total/fee/createdAt
  // are immutable after creation — omitted here, same discipline as
  // ProductMapper.toPersistenceUpdate.
  static toPersistenceUpdate(order: Order): Prisma.OrderUncheckedUpdateInput {
    return {
      status: order.status.value,
      paymentMethod: order.paymentMethod,
      midtransTransactionId: order.midtransTransactionId,
      paidAt: order.paidAt,
      holdingUntil: order.holdingUntil,
      releasedAt: order.releasedAt,
    };
  }

  static itemToPersistenceCreate(orderId: string, item: OrderItem): Prisma.OrderItemUncheckedCreateInput {
    return {
      id: item.id,
      orderId,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      productTypeSnapshot: item.productTypeSnapshot,
      priceSnapshot: item.priceSnapshot.amount,
      hppSnapshot: item.hppSnapshot?.amount ?? null,
      qty: item.qty,
      createdAt: item.createdAt,
    };
  }

  static historyToPersistenceCreate(orderId: string, entry: OrderStatusHistory): Prisma.OrderStatusHistoryUncheckedCreateInput {
    return {
      id: entry.id,
      orderId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedByType: entry.actor.type,
      changedById: entry.actor.id,
      reason: entry.reason,
      createdAt: entry.createdAt,
    };
  }

  private static itemToDomain(row: PrismaOrderItem): OrderItem {
    const priceResult = Money.fromRupiah(row.priceSnapshot);
    if (priceResult.isErr()) {
      throw new Error(`Corrupt order item row: invalid price for item "${row.id}"`);
    }
    let hpp: Money | null = null;
    if (row.hppSnapshot !== null) {
      const hppResult = Money.fromRupiah(row.hppSnapshot);
      if (hppResult.isErr()) {
        throw new Error(`Corrupt order item row: invalid hpp for item "${row.id}"`);
      }
      hpp = hppResult.unwrap();
    }

    return OrderItem.reconstitute(
      {
        productId: row.productId,
        productNameSnapshot: row.productNameSnapshot,
        productTypeSnapshot: row.productTypeSnapshot,
        priceSnapshot: priceResult.unwrap(),
        hppSnapshot: hpp,
        qty: row.qty,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  private static historyToDomain(row: PrismaOrderStatusHistory): OrderStatusHistory {
    return OrderStatusHistory.reconstitute(
      {
        fromStatus: row.fromStatus as OrderStatusValue | null,
        toStatus: row.toStatus as OrderStatusValue,
        actor: StatusChangeActor.of(row.changedByType as StatusActorTypeValue, row.changedById),
        reason: row.reason,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }
}
