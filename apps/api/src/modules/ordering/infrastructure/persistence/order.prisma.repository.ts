import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Order } from '../../domain/entities/order.aggregate';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderMapper, PrismaOrderWithRelations } from './order.mapper';

const RELATIONS_INCLUDE = { items: true, statusHistory: true };

@Injectable()
export class OrderPrismaRepository implements OrderRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: UniqueId): Promise<Order | null> {
    const row: PrismaOrderWithRelations | null = await this.transactionManager.client.order.findUnique({
      where: { id },
      include: RELATIONS_INCLUDE,
    });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findByIdForUpdate(id: UniqueId): Promise<Order | null> {
    const locked = await this.transactionManager.client.$queryRaw<{ id: string }[]>`
      SELECT id FROM orders WHERE id = ${id} FOR UPDATE
    `;
    if (locked.length === 0) return null;
    return this.findById(id);
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const row: PrismaOrderWithRelations | null = await this.transactionManager.client.order.findUnique({
      where: { orderNumber },
      include: RELATIONS_INCLUDE,
    });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findByMidtransTransactionId(transactionId: string): Promise<Order | null> {
    const row: PrismaOrderWithRelations | null = await this.transactionManager.client.order.findFirst({
      where: { midtransTransactionId: transactionId },
      include: RELATIONS_INCLUDE,
    });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findExpirableIds(cutoff: Date, limit: number): Promise<string[]> {
    const rows = await this.transactionManager.client.order.findMany({
      where: { status: 'pending_payment', createdAt: { lt: cutoff } },
      select: { id: true },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.id);
  }

  async findReleasableIds(now: Date, limit: number): Promise<string[]> {
    const rows = await this.transactionManager.client.$queryRaw<{ id: string }[]>`
      SELECT o.id FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.status = 'holding' AND o.holding_until <= ${now} AND s.settlement_mode = 'auto'
      ORDER BY o.holding_until ASC, o.id ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.id);
  }

  async save(order: Order): Promise<void> {
    await this.transactionManager.client.order.upsert({
      where: { id: order.id },
      create: OrderMapper.toPersistenceCreate(order),
      update: OrderMapper.toPersistenceUpdate(order),
    });

    // Items and status history are append-only — createMany + skipDuplicates
    // on the (stable, in-memory-generated) id rather than the upsert-then-
    // diff-delete pattern used for mutable child collections elsewhere.
    if (order.items.length > 0) {
      await this.transactionManager.client.orderItem.createMany({
        data: order.items.map((item) => OrderMapper.itemToPersistenceCreate(order.id, item)),
        skipDuplicates: true,
      });
    }

    if (order.statusHistory.length > 0) {
      await this.transactionManager.client.orderStatusHistory.createMany({
        data: order.statusHistory.map((entry) => OrderMapper.historyToPersistenceCreate(order.id, entry)),
        skipDuplicates: true,
      });
    }
  }
}
