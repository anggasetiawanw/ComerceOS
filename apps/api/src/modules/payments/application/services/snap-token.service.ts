import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { ORDER_REPOSITORY, OrderRepository } from '../../../ordering/domain/repositories/order.repository';
import { buildSnapItemsForOrder } from '../../../ordering/application/services/checkout.service';
import { PAYMENT_GATEWAY, PaymentGateway, SnapTransaction } from '../../../ordering/application/ports/payment-gateway.port';
import { USER_REPOSITORY, UserRepository } from '../../../identity/domain/repositories/user.repository';
import { OrderNotPayableError, OrderPaymentNotFoundError } from '../../domain/errors/payments.errors';

type ReissueError = OrderPaymentNotFoundError | OrderNotPayableError;

@Injectable()
export class SnapTokenService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
    private readonly config: AppConfigService,
  ) {}

  async reissue(buyerId: string, orderId: string): Promise<Result<SnapTransaction, ReissueError>> {
    const order = await this.orders.findById(orderId);
    if (!order || !order.belongsToBuyer(buyerId)) {
      return Result.err(new OrderPaymentNotFoundError());
    }
    if (order.status.value !== 'pending_payment') {
      return Result.err(new OrderNotPayableError(order.status.value));
    }

    const buyer = await this.users.findById(buyerId);
    if (!buyer) {
      return Result.err(new OrderPaymentNotFoundError());
    }

    const snap = await this.paymentGateway.createSnapTransaction({
      orderNumber: order.orderNumber.value,
      grossAmount: order.total,
      items: buildSnapItemsForOrder(order),
      buyerName: buyer.name,
      buyerEmail: buyer.email.value,
      buyerPhone: buyer.phone,
      expiryHours: this.config.orderExpiryHours,
      finishRedirectUrl: `${this.config.frontendUrl}/checkout/${order.orderNumber.value}/status`,
    });

    return Result.ok(snap);
  }
}
