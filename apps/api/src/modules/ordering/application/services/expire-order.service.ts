import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { Order } from '../../domain/entities/order.aggregate';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { IllegalTransitionError, OrderNotFoundError } from '../../domain/errors/ordering.errors';

type ExpireOrderError = OrderNotFoundError | IllegalTransitionError;

@Injectable()
export class ExpireOrderService {
  private readonly logger = new Logger(ExpireOrderService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
    private readonly config: AppConfigService,
  ) {}

  async execute(orderId: string): Promise<Result<Order, ExpireOrderError>> {
    return this.transactionManager.runInTransaction(async () => {
      const order = await this.orders.findByIdForUpdate(orderId);
      if (!order) return Result.err(new OrderNotFoundError());

      const result = order.expire();
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.orders.save(order);
      await this.outbox.enqueueAll(order.pullDomainEvents());
      return Result.ok(order);
    });
  }

  // Batch entry point for the expire-orders job (.docs/10-background-jobs.md
  // §2 — every 10 min). Each order expires in its own transaction so one
  // failure doesn't roll back the whole batch.
  async expireBatch(batchSize: number): Promise<{ expired: number; failed: number }> {
    const cutoff = new Date(Date.now() - this.config.orderExpiryHours * 60 * 60 * 1000);
    const ids = await this.orders.findExpirableIds(cutoff, batchSize);

    let expired = 0;
    let failed = 0;
    for (const id of ids) {
      const result = await this.execute(id);
      if (result.isOk()) {
        expired += 1;
      } else {
        failed += 1;
        this.logger.warn(`Failed to expire order ${id}: ${result.unwrapErr().message}`);
      }
    }
    return { expired, failed };
  }
}
