import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { Order } from '../../domain/entities/order.aggregate';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';
import { IllegalTransitionError, OrderNotFoundError } from '../../domain/errors/ordering.errors';

type CancelOrderError = OrderNotFoundError | IllegalTransitionError;

@Injectable()
export class CancelOrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
  ) {}

  async execute(orderId: string, actor: StatusChangeActor, reason?: string): Promise<Result<Order, CancelOrderError>> {
    return this.transactionManager.runInTransaction(async () => {
      const order = await this.orders.findByIdForUpdate(orderId);
      if (!order) return Result.err(new OrderNotFoundError());

      const result = order.cancel(actor, reason);
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.orders.save(order);
      await this.outbox.enqueueAll(order.pullDomainEvents());
      return Result.ok(order);
    });
  }
}
