import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { OutboxService } from '../../../../shared/infrastructure/outbox/outbox.service';
import { AUDIT_LOG_PORT, AuditLogPort } from '../../../administration/application/ports/audit-log.port';
import { Order } from '../../domain/entities/order.aggregate';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';
import { HoldingPeriodNotElapsedError, IllegalTransitionError, OrderNotFoundError } from '../../domain/errors/ordering.errors';

type ReleaseOrderError = OrderNotFoundError | IllegalTransitionError | HoldingPeriodNotElapsedError;

// Serves both the release-holding-balance scheduler (system actor, batched)
// and POST /orders/:id/release (seller actor, single order). Order.release()
// already re-checks the holding floor against the row read under
// findByIdForUpdate's lock — that's what makes "trust the query, re-check
// the floor in code" true rather than aspirational
// (.docs/10-background-jobs.md §"release-holding-balance").
@Injectable()
export class ReleaseOrderService {
  private readonly logger = new Logger(ReleaseOrderService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: AuditLogPort,
    private readonly transactionManager: TransactionManager,
    private readonly outbox: OutboxService,
  ) {}

  async execute(
    orderId: string,
    actor: StatusChangeActor,
    opts?: { forced?: boolean; expectedStoreId?: string },
  ): Promise<Result<Order, ReleaseOrderError>> {
    return this.transactionManager.runInTransaction(async () => {
      const order = await this.orders.findByIdForUpdate(orderId);
      // Not-found rather than forbidden on a store mismatch — same
      // information-hiding precedent as Order.belongsToBuyer's callers, so
      // a seller probing order ids cannot distinguish "not yours" from
      // "doesn't exist".
      if (!order || (opts?.expectedStoreId && !order.belongsToStore(opts.expectedStoreId))) {
        return Result.err(new OrderNotFoundError());
      }

      const result = order.release({ releasedAt: new Date(), actor, forced: opts?.forced });
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.orders.save(order);
      await this.outbox.enqueueAll(order.pullDomainEvents());

      // Only the seller's own manual click is audited here — a system
      // release (the release-holding-balance scheduler) is already fully
      // explained by the order's own status history, and auditing every
      // scheduled release would flood the audit log with routine activity.
      if (actor.type === 'seller') {
        await this.auditLog.record({
          actorType: 'user',
          actorId: actor.id,
          action: 'order.released',
          entityType: 'order',
          entityId: order.id,
        });
      }

      return Result.ok(order);
    });
  }

  // Batch entry point for the release-holding-balance job (every 15 min,
  // .docs/10-background-jobs.md §4). Each order releases in its own
  // transaction, matching ExpireOrderService.expireBatch's precedent, so
  // one bad order doesn't roll back the rest of the batch. No cursor state
  // is needed: every successfully released order leaves findReleasableIds'
  // result set on the next run, which is what makes a re-run idempotent.
  async releaseBatch(batchSize: number): Promise<{ released: number; skipped: number; failed: number }> {
    const ids = await this.orders.findReleasableIds(new Date(), batchSize);

    let released = 0;
    let skipped = 0;
    let failed = 0;
    for (const id of ids) {
      const result = await this.execute(id, StatusChangeActor.system());
      if (result.isOk()) {
        released += 1;
        continue;
      }
      const error = result.unwrapErr();
      if (error instanceof IllegalTransitionError || error instanceof HoldingPeriodNotElapsedError) {
        skipped += 1;
        this.logger.warn(`Skipped releasing order ${id}: ${error.message}`);
      } else {
        failed += 1;
        this.logger.error(`Failed to release order ${id}: ${error.message}`);
      }
    }

    if (skipped > 0) {
      this.logger.warn(`release-holding-balance: ${skipped} order(s) skipped this run — will be rescanned`);
    }
    return { released, skipped, failed };
  }
}
