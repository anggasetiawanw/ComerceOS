import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { Money, MoneyError } from '../../../../shared/kernel/value-objects/money.vo';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { AUDIT_LOG_PORT, AuditLogPort } from '../../../administration/application/ports/audit-log.port';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../catalog/domain/repositories/product.repository';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { BUYER_DIRECTORY, BuyerDirectory } from '../ports/buyer-directory.port';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderFactory, ManualOrderBasketLine } from '../../domain/factories/order.factory';
import { OrderPricingService } from '../../domain/services/order-pricing.service';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import {
  EmptyBasketError,
  InvalidOrderError,
  ProductNotFoundForStoreError,
  StoreNotFoundForOrderError,
} from '../../domain/errors/ordering.errors';

export interface CreateManualOrderItemInput {
  productId: string;
  qty: number;
  priceOverride?: string;
}

type CreateManualOrderError =
  | EmptyBasketError
  | InvalidOrderError
  | StoreNotFoundForOrderError
  | ProductNotFoundForStoreError
  | MoneyError;

// Path B: a seller prices and creates an order by hand, typically after a
// WhatsApp conversation. No Snap token — a manual order is paid out of
// band and settled via POST /orders/:id/confirm-payment
// (.docs/12-roadmap-sprints.md Sprint 9).
@Injectable()
export class CreateManualOrderService {
  private readonly orderFactory = new OrderFactory(new OrderPricingService());

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(BUYER_DIRECTORY) private readonly buyerDirectory: BuyerDirectory,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: AuditLogPort,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
    private readonly config: AppConfigService,
  ) {}

  async execute(
    storeId: string,
    sellerId: string,
    params: {
      items: CreateManualOrderItemInput[];
      buyerEmail: string;
      buyerName: string;
      buyerPhone: string | null;
      inquiryId?: string | null;
    },
  ): Promise<Result<Order, CreateManualOrderError>> {
    if (params.items.length === 0) {
      return Result.err(new EmptyBasketError());
    }

    const store = await this.stores.findById(storeId);
    if (!store) return Result.err(new StoreNotFoundForOrderError());

    const lines: ManualOrderBasketLine[] = [];
    for (const item of params.items) {
      const product = await this.products.findByIdForStore(storeId, item.productId);
      if (!product) return Result.err(new ProductNotFoundForStoreError(item.productId));

      let priceOverride: Money | null = null;
      if (item.priceOverride !== undefined) {
        const overrideResult = Money.fromString(item.priceOverride);
        if (overrideResult.isErr()) return Result.err(overrideResult.unwrapErr());
        priceOverride = overrideResult.unwrap();
      }

      lines.push({
        productId: product.id,
        productNameSnapshot: product.name,
        productTypeSnapshot: product.productType.value,
        price: product.price,
        hpp: product.hpp,
        qty: item.qty,
        priceOverride,
      });
    }

    const buyer = await this.buyerDirectory.findOrCreateByEmail({
      email: params.buyerEmail,
      name: params.buyerName,
      phone: params.buyerPhone,
    });

    const feeRateBasisPoints = store.plan.feeRateBasisPoints({
      free: this.config.planFeeRateFree,
      pro: this.config.planFeeRatePro,
    });

    const orderResult = this.orderFactory.fromManualCreation({
      storeId,
      buyerId: buyer.id,
      inquiryId: params.inquiryId,
      items: lines,
      feeRateBasisPoints,
    });
    if (orderResult.isErr()) return Result.err(orderResult.unwrapErr());
    const order = orderResult.unwrap();

    await this.transactionManager.runInTransaction(async () => {
      await this.orders.save(order);
      await this.outbox.enqueueAll(order.pullDomainEvents());
      await this.auditLog.record({
        actorType: 'user',
        actorId: sellerId,
        action: 'order.manual_created',
        entityType: 'order',
        entityId: order.id,
        metadata: { buyerId: buyer.id, inquiryId: params.inquiryId ?? null },
      });
    });

    return Result.ok(order);
  }
}
