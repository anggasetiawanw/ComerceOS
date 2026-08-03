import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../catalog/domain/repositories/product.repository';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderFactory, CheckoutBasketLine } from '../../domain/factories/order.factory';
import { OrderPricingService } from '../../domain/services/order-pricing.service';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import {
  EmptyBasketError,
  InsufficientStockError,
  InvalidOrderError,
  MixedStoreBasketError,
  ProductNotAvailableError,
  StoreNotFoundForOrderError,
} from '../../domain/errors/ordering.errors';
import { PAYMENT_GATEWAY, PaymentGateway, SnapItemInput } from '../ports/payment-gateway.port';

export interface CheckoutItemInput {
  productId: string;
  qty: number;
}

export interface CheckoutQuoteResult {
  subtotal: string;
  discountAmount: string;
  total: string;
  feeAmount: string;
}

export interface CheckoutCreateResult {
  order: Order;
  snapToken: string | null;
  snapRedirectUrl: string | null;
}

type ResolveBasketError = EmptyBasketError | ProductNotAvailableError | InsufficientStockError | MixedStoreBasketError;
type CheckoutError = ResolveBasketError | StoreNotFoundForOrderError | InvalidOrderError;

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly orderFactory = new OrderFactory(new OrderPricingService());

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
    private readonly config: AppConfigService,
  ) {}

  async quote(items: CheckoutItemInput[]): Promise<Result<CheckoutQuoteResult, CheckoutError>> {
    const resolved = await this.resolveBasket(items);
    if (resolved.isErr()) return Result.err(resolved.unwrapErr());
    const { storeId, lines } = resolved.unwrap();

    const store = await this.stores.findById(storeId);
    if (!store) return Result.err(new StoreNotFoundForOrderError());

    const feeRateBasisPoints = store.plan.feeRateBasisPoints({
      free: this.config.planFeeRateFree,
      pro: this.config.planFeeRatePro,
    });

    const pricingResult = new OrderPricingService().price({
      items: lines.map((line) => ({ price: line.price, qty: line.qty })),
      feeRateBasisPoints,
    });
    if (pricingResult.isErr()) return Result.err(pricingResult.unwrapErr());
    const pricing = pricingResult.unwrap();

    return Result.ok({
      subtotal: pricing.subtotal.toString(),
      discountAmount: pricing.discount.amount.toString(),
      total: pricing.total.toString(),
      feeAmount: pricing.fee.amount.toString(),
    });
  }

  async create(
    buyerId: string,
    params: { items: CheckoutItemInput[]; buyerName: string; buyerEmail: string; buyerPhone: string | null },
  ): Promise<Result<CheckoutCreateResult, CheckoutError>> {
    const resolved = await this.resolveBasket(params.items);
    if (resolved.isErr()) return Result.err(resolved.unwrapErr());
    const { storeId, lines } = resolved.unwrap();

    const store = await this.stores.findById(storeId);
    if (!store) return Result.err(new StoreNotFoundForOrderError());

    const feeRateBasisPoints = store.plan.feeRateBasisPoints({
      free: this.config.planFeeRateFree,
      pro: this.config.planFeeRatePro,
    });

    const orderResult = this.orderFactory.fromCheckout({ storeId, buyerId, items: lines, feeRateBasisPoints });
    if (orderResult.isErr()) return Result.err(orderResult.unwrapErr());
    const order = orderResult.unwrap();

    await this.transactionManager.runInTransaction(async () => {
      await this.orders.save(order);
      await this.outbox.enqueueAll(order.pullDomainEvents());
    });

    let snapToken: string | null = null;
    let snapRedirectUrl: string | null = null;
    try {
      const snap = await this.paymentGateway.createSnapTransaction({
        orderNumber: order.orderNumber.value,
        grossAmount: order.total,
        items: buildSnapItemsForOrder(order),
        buyerName: params.buyerName,
        buyerEmail: params.buyerEmail,
        buyerPhone: params.buyerPhone,
        expiryHours: this.config.orderExpiryHours,
        finishRedirectUrl: `${this.config.frontendUrl}/checkout/${order.orderNumber.value}/status`,
      });
      snapToken = snap.token;
      snapRedirectUrl = snap.redirectUrl;
    } catch (error) {
      // The order is already committed (pending_payment). A Snap failure is
      // recoverable — the buyer re-requests a token via
      // POST /payments/orders/:orderId/snap-token (.docs/09-payments-ledger.md §10).
      this.logger.error(
        `Snap token creation failed for order ${order.orderNumber.value}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return Result.ok({ order, snapToken, snapRedirectUrl });
  }

  private async resolveBasket(
    items: CheckoutItemInput[],
  ): Promise<Result<{ storeId: string; lines: CheckoutBasketLine[] }, ResolveBasketError>> {
    if (items.length === 0) {
      return Result.err(new EmptyBasketError());
    }

    const lines: CheckoutBasketLine[] = [];
    let storeId: string | null = null;

    for (const item of items) {
      const product = await this.products.findById(item.productId);
      if (!product || !product.status.isActive()) {
        return Result.err(new ProductNotAvailableError(item.productId));
      }

      if (storeId === null) {
        storeId = product.storeId;
      } else if (storeId !== product.storeId) {
        return Result.err(new MixedStoreBasketError());
      }

      if (product.stock.value !== null && product.stock.value < item.qty) {
        return Result.err(new InsufficientStockError(item.productId));
      }

      lines.push({
        productId: product.id,
        productNameSnapshot: product.name,
        productTypeSnapshot: product.productType.value,
        price: product.price,
        hpp: product.hpp,
        qty: item.qty,
      });
    }

    return Result.ok({ storeId: storeId as string, lines });
  }
}

// Shared by CheckoutService (initial token) and payments' SnapTokenService
// (re-issue) so the item_details-must-sum-to-gross_amount rule (discount as
// a negative line item) lives in exactly one place.
export const buildSnapItemsForOrder = (order: Order): SnapItemInput[] => {
  const lines: SnapItemInput[] = order.items.map((item) => ({
    id: item.productId,
    name: item.productNameSnapshot,
    price: item.priceSnapshot,
    quantity: item.qty,
  }));

  if (!order.discount.amount.isZero()) {
    lines.push({
      id: 'platform_discount',
      name: `Diskon${order.discount.code ? ` (${order.discount.code})` : ''}`,
      price: order.discount.amount,
      quantity: -1,
    });
  }
  return lines;
};
