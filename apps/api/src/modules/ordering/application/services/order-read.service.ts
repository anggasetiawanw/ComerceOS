import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { Order } from '../../domain/entities/order.aggregate';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import {
  BuyerOrderListResult,
  ORDER_READ_REPOSITORY,
  OrderReadRepository,
} from '../../domain/repositories/order-read.repository';
import { OrderNotFoundError } from '../../domain/errors/ordering.errors';

@Injectable()
export class OrderReadService {
  constructor(
    @Inject(ORDER_READ_REPOSITORY) private readonly reads: OrderReadRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async listForBuyer(buyerId: string, params: { page: number; limit: number }): Promise<BuyerOrderListResult> {
    return this.reads.listForBuyer(buyerId, params);
  }

  async getForBuyer(buyerId: string, orderId: string): Promise<Result<Order, OrderNotFoundError>> {
    const order = await this.orders.findById(orderId);
    if (!order || !order.belongsToBuyer(buyerId)) return Result.err(new OrderNotFoundError());
    return Result.ok(order);
  }

  async getByOrderNumberForBuyer(buyerId: string, orderNumber: string): Promise<Result<Order, OrderNotFoundError>> {
    const order = await this.orders.findByOrderNumber(orderNumber);
    if (!order || !order.belongsToBuyer(buyerId)) return Result.err(new OrderNotFoundError());
    return Result.ok(order);
  }
}
