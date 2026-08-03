import { forwardRef, Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { OutboxModule } from '../../shared/infrastructure/outbox/outbox.module';
import { StoreModule } from '../store/store.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../administration/audit.module';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository';
import { ORDER_READ_REPOSITORY } from './domain/repositories/order-read.repository';
import { OrderPrismaRepository } from './infrastructure/persistence/order.prisma.repository';
import { OrderReadPrismaRepository } from './infrastructure/persistence/order-read.prisma.repository';
import { CheckoutService } from './application/services/checkout.service';
import { MarkOrderPaidService } from './application/services/mark-order-paid.service';
import { CancelOrderService } from './application/services/cancel-order.service';
import { ExpireOrderService } from './application/services/expire-order.service';
import { ReleaseOrderService } from './application/services/release-order.service';
import { OrderReadService } from './application/services/order-read.service';
import { CheckoutController } from './presentation/http/checkout.controller';
import { BuyerOrdersController } from './presentation/http/buyer-orders.controller';
import { StoreOrdersController } from './presentation/http/store-orders.controller';

@Module({
  imports: [
    AppConfigModule,
    StoreModule,
    CatalogModule,
    IdentityModule,
    OutboxModule,
    AuditModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [CheckoutController, BuyerOrdersController, StoreOrdersController],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: OrderPrismaRepository },
    { provide: ORDER_READ_REPOSITORY, useClass: OrderReadPrismaRepository },
    CheckoutService,
    MarkOrderPaidService,
    CancelOrderService,
    ExpireOrderService,
    ReleaseOrderService,
    OrderReadService,
  ],
  exports: [
    ORDER_REPOSITORY,
    MarkOrderPaidService,
    CancelOrderService,
    ExpireOrderService,
    ReleaseOrderService,
    OrderReadService,
  ],
})
export class OrderingModule {}
