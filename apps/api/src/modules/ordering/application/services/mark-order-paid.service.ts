import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { ProductRiskTier } from '../../../../shared/kernel/value-objects/product-risk-tier';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { ProductType } from '../../../catalog/domain/value-objects/product-type.vo';
import { ProductRiskTierResolver } from '../../../catalog/domain/services/product-risk-tier.resolver';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { SettlementPolicyResolver } from '../../../store/domain/services/settlement-policy-resolver.service';
import { Order } from '../../domain/entities/order.aggregate';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { HoldingPeriodCalculator } from '../../domain/services/holding-period.calculator';
import { StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';
import { IllegalTransitionError, OrderNotFoundError, StoreNotFoundForOrderError } from '../../domain/errors/ordering.errors';

export interface MarkOrderPaidInput {
  method: string;
  transactionId: string | null;
  paidAt?: Date;
}

type MarkOrderPaidError = OrderNotFoundError | StoreNotFoundForOrderError | IllegalTransitionError;

// The pending_payment -> paid -> holding transition happens inside one
// transaction, alongside the outbox insert, per .docs/08-order-state-machine.md
// §6. No ledger write yet — that consumer arrives in Sprint 6, reading
// OrderPaid off the outbox.
@Injectable()
export class MarkOrderPaidService {
  private readonly holdingPeriodCalculator = new HoldingPeriodCalculator();

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    private readonly riskTierResolver: ProductRiskTierResolver,
    private readonly settlementPolicyResolver: SettlementPolicyResolver,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
  ) {}

  async execute(orderId: string, params: MarkOrderPaidInput): Promise<Result<Order, MarkOrderPaidError>> {
    return this.transactionManager.runInTransaction(async () => {
      const order = await this.orders.findByIdForUpdate(orderId);
      if (!order) return Result.err(new OrderNotFoundError());

      const store = await this.stores.findById(order.storeId);
      if (!store) return Result.err(new StoreNotFoundForOrderError());

      const riskTiers: ProductRiskTier[] = order.items.map((item) => {
        const typeResult = ProductType.create(item.productTypeSnapshot);
        return typeResult.isOk() ? this.riskTierResolver.resolve(typeResult.unwrap()) : 'high';
      });

      const paidAt = params.paidAt ?? new Date();
      const settlementPolicy = this.settlementPolicyResolver.resolve(store.settlementMode);
      const holdingUntil = this.holdingPeriodCalculator.compute({ riskTiers, paidAt, settlementPolicy });

      const result = order.markPaid({
        paidAt,
        method: params.method,
        transactionId: params.transactionId,
        holdingUntil,
        actor: StatusChangeActor.system(),
      });
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.orders.save(order);
      await this.outbox.enqueueAll(order.pullDomainEvents());
      return Result.ok(order);
    });
  }
}
