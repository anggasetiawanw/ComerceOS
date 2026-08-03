import { UniqueId } from '../../../../shared/kernel/uuid';
import { Order } from '../entities/order.aggregate';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  findById(id: UniqueId): Promise<Order | null>;
  // SELECT ... FOR UPDATE — required before any write transition so two
  // concurrent webhooks for the same order serialize (.docs/08 §6).
  findByIdForUpdate(id: UniqueId): Promise<Order | null>;
  findByOrderNumber(orderNumber: string): Promise<Order | null>;
  findByMidtransTransactionId(transactionId: string): Promise<Order | null>;
  // pending_payment orders created before `cutoff` — feeds the expire-orders job.
  findExpirableIds(cutoff: Date, limit: number): Promise<string[]>;
  save(order: Order): Promise<void>;
}
