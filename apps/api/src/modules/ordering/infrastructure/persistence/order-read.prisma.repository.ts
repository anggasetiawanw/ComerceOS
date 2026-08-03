import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { BuyerOrderListResult, OrderReadRepository } from '../../domain/repositories/order-read.repository';

interface BuyerOrderRow {
  id: string;
  order_number: string;
  store_id: string;
  store_name: string;
  status: string;
  total: bigint;
  created_at: Date;
}

@Injectable()
export class OrderReadPrismaRepository implements OrderReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForBuyer(buyerId: string, params: { page: number; limit: number }): Promise<BuyerOrderListResult> {
    const offset = (params.page - 1) * params.limit;

    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<BuyerOrderRow[]>`
        SELECT o.id, o.order_number, o.store_id, s.display_name AS store_name, o.status, o.total, o.created_at
        FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.buyer_id = ${buyerId}
        ORDER BY o.created_at DESC
        LIMIT ${params.limit} OFFSET ${offset}
      `,
      this.prisma.order.count({ where: { buyerId } }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        storeId: row.store_id,
        storeName: row.store_name,
        status: row.status,
        total: row.total.toString(),
        createdAt: row.created_at,
      })),
      total,
    };
  }
}
