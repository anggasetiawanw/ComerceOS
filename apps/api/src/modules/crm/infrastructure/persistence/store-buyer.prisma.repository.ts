import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { generateId } from '../../../../shared/kernel/uuid';
import { StoreBuyerRepository } from '../../domain/repositories/store-buyer.repository';

@Injectable()
export class StoreBuyerPrismaRepository implements StoreBuyerRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async upsertOnPurchase(storeId: string, buyerId: string): Promise<void> {
    const id = generateId();

    // Recompute, never increment (see the interface doc comment). Status
    // filter is deliberate: 'refunded' would inflate lifetime spend,
    // excluding 'paid'/'holding' would omit the order that triggered this
    // job — neither is specified in the docs, both were decided here.
    // tags/notes are absent from the SET list on purpose: a replayed event
    // must never wipe seller-entered data.
    await this.transactionManager.client.$executeRaw`
      INSERT INTO store_buyers (id, store_id, buyer_id, first_purchase_at, last_purchase_at, total_orders, total_spent)
      SELECT ${id}, o.store_id, o.buyer_id, MIN(o.paid_at), MAX(o.paid_at), COUNT(*)::int, COALESCE(SUM(o.total), 0)
      FROM orders o
      WHERE o.store_id = ${storeId} AND o.buyer_id = ${buyerId}
        AND o.status IN ('paid', 'holding', 'released')
        AND o.paid_at IS NOT NULL
      GROUP BY o.store_id, o.buyer_id
      ON CONFLICT (store_id, buyer_id) DO UPDATE SET
        first_purchase_at = EXCLUDED.first_purchase_at,
        last_purchase_at  = EXCLUDED.last_purchase_at,
        total_orders      = EXCLUDED.total_orders,
        total_spent       = EXCLUDED.total_spent
    `;
  }
}
