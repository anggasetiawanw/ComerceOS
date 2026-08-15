import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { AUDIT_LOG_PORT, AuditLogPort } from '../../../administration/application/ports/audit-log.port';
import { Order } from '../../domain/entities/order.aggregate';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { StatusChangeActor } from '../../domain/value-objects/status-change-actor.vo';
import { MarkOrderPaidService } from './mark-order-paid.service';
import {
  IllegalTransitionError,
  ManualOrderSourceRequiredError,
  OrderNotFoundError,
  StoreNotFoundForOrderError,
} from '../../domain/errors/ordering.errors';

type ConfirmManualPaymentError =
  | OrderNotFoundError
  | ManualOrderSourceRequiredError
  | IllegalTransitionError
  | StoreNotFoundForOrderError;

// Reuses MarkOrderPaidService for the holding-period computation and the
// paid -> holding transition rather than duplicating it — the seller's
// manual confirmation and Midtrans's webhook are just two different actors
// hitting the same state machine (.docs/08-order-state-machine.md §3 row 3).
@Injectable()
export class ConfirmManualPaymentService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: AuditLogPort,
    private readonly markOrderPaid: MarkOrderPaidService,
  ) {}

  async execute(
    orderId: string,
    userId: string,
    opts: { expectedStoreId: string },
  ): Promise<Result<Order, ConfirmManualPaymentError>> {
    const order = await this.orders.findById(orderId);
    // Not-found rather than forbidden on a store mismatch — same
    // information-hiding precedent as ReleaseOrderService.
    if (!order || !order.belongsToStore(opts.expectedStoreId)) {
      return Result.err(new OrderNotFoundError());
    }
    if (order.source.value !== 'manual') {
      return Result.err(new ManualOrderSourceRequiredError());
    }

    const result = await this.markOrderPaid.execute(orderId, {
      method: 'manual',
      transactionId: null,
      actor: StatusChangeActor.seller(userId),
    });
    if (result.isErr()) return result;

    await this.auditLog.record({
      actorType: 'user',
      actorId: userId,
      action: 'order.manual_payment_confirmed',
      entityType: 'order',
      entityId: orderId,
    });

    return result;
  }
}
