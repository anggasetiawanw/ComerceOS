import { Result } from '../../../../shared/kernel/result';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { Order } from '../entities/order.aggregate';
import { OrderItem } from '../entities/order-item.entity';
import { OrderSource } from '../value-objects/order-source.vo';
import { OrderPricingService } from '../services/order-pricing.service';
import { EmptyBasketError, InvalidOrderError } from '../errors/ordering.errors';

export interface CheckoutBasketLine {
  productId: string;
  productNameSnapshot: string;
  productTypeSnapshot: string;
  price: Money;
  hpp: Money | null;
  qty: number;
}

export interface ManualOrderBasketLine {
  productId: string;
  productNameSnapshot: string;
  productTypeSnapshot: string;
  price: Money;
  hpp: Money | null;
  qty: number;
  // Below-HPP is advisory only (MarginWarning is Sprint 10) — nothing here
  // blocks a below-cost price override.
  priceOverride: Money | null;
}

// The only construction path for a self-checkout order — everything after
// creation (transitions, pricing invariants) is enforced by Order itself, so
// this factory's only job is turning raw checkout inputs into the item
// snapshots and computed pricing that Order.create() requires.
// OrderFactory.fromManualCreation (Sprint 9, Path B) will converge on the
// same Order.create() call.
export class OrderFactory {
  constructor(private readonly pricing: OrderPricingService) {}

  fromCheckout(params: {
    storeId: string;
    buyerId: string;
    items: readonly CheckoutBasketLine[];
    discountCode?: string | null;
    discountAmount?: Money;
    feeRateBasisPoints: number;
  }): Result<Order, EmptyBasketError | InvalidOrderError> {
    if (params.items.length === 0) {
      return Result.err(new EmptyBasketError());
    }

    const orderItems: OrderItem[] = [];
    for (const line of params.items) {
      const itemResult = OrderItem.create({
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        productTypeSnapshot: line.productTypeSnapshot,
        priceSnapshot: line.price,
        hppSnapshot: line.hpp,
        qty: line.qty,
      });
      if (itemResult.isErr()) return Result.err(itemResult.unwrapErr());
      orderItems.push(itemResult.unwrap());
    }

    const pricingResult = this.pricing.price({
      items: params.items.map((line) => ({ price: line.price, qty: line.qty })),
      discountCode: params.discountCode,
      discountAmount: params.discountAmount,
      feeRateBasisPoints: params.feeRateBasisPoints,
    });
    if (pricingResult.isErr()) return Result.err(pricingResult.unwrapErr());
    const pricing = pricingResult.unwrap();

    return Order.create({
      storeId: params.storeId,
      buyerId: params.buyerId,
      source: OrderSource.selfCheckout(),
      items: orderItems,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      total: pricing.total,
      fee: pricing.fee,
    });
  }

  // Path B — manual order creation, converging on the same Order.create()
  // call as fromCheckout so post-creation behavior cannot diverge between
  // the two paths (.docs/04-entity-design.md §3). Each line's snapshot uses
  // priceOverride when the seller supplied one, the product's own price
  // otherwise.
  fromManualCreation(params: {
    storeId: string;
    buyerId: string;
    inquiryId?: string | null;
    items: readonly ManualOrderBasketLine[];
    feeRateBasisPoints: number;
  }): Result<Order, EmptyBasketError | InvalidOrderError> {
    if (params.items.length === 0) {
      return Result.err(new EmptyBasketError());
    }

    const orderItems: OrderItem[] = [];
    for (const line of params.items) {
      const effectivePrice = line.priceOverride ?? line.price;
      const itemResult = OrderItem.create({
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        productTypeSnapshot: line.productTypeSnapshot,
        priceSnapshot: effectivePrice,
        hppSnapshot: line.hpp,
        qty: line.qty,
      });
      if (itemResult.isErr()) return Result.err(itemResult.unwrapErr());
      orderItems.push(itemResult.unwrap());
    }

    const pricingResult = this.pricing.price({
      items: params.items.map((line) => ({ price: line.priceOverride ?? line.price, qty: line.qty })),
      feeRateBasisPoints: params.feeRateBasisPoints,
    });
    if (pricingResult.isErr()) return Result.err(pricingResult.unwrapErr());
    const pricing = pricingResult.unwrap();

    return Order.create({
      storeId: params.storeId,
      buyerId: params.buyerId,
      source: OrderSource.manual(),
      inquiryId: params.inquiryId ?? null,
      items: orderItems,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      total: pricing.total,
      fee: pricing.fee,
    });
  }
}
