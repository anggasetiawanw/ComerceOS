import { forwardRef, Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { OutboxModule } from '../../shared/infrastructure/outbox/outbox.module';
import { StoreModule } from '../store/store.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { BuyerDirectoryService } from '../identity/application/services/buyer-directory.service';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../administration/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository';
import { ORDER_READ_REPOSITORY } from './domain/repositories/order-read.repository';
import { INQUIRY_REPOSITORY } from './domain/repositories/inquiry.repository';
import { INQUIRY_READ_REPOSITORY } from './domain/repositories/inquiry-read.repository';
import { BUYER_DIRECTORY } from './application/ports/buyer-directory.port';
import { OrderPrismaRepository } from './infrastructure/persistence/order.prisma.repository';
import { OrderReadPrismaRepository } from './infrastructure/persistence/order-read.prisma.repository';
import { InquiryPrismaRepository } from './infrastructure/persistence/inquiry.prisma.repository';
import { InquiryReadPrismaRepository } from './infrastructure/persistence/inquiry-read.prisma.repository';
import { CheckoutService } from './application/services/checkout.service';
import { MarkOrderPaidService } from './application/services/mark-order-paid.service';
import { CancelOrderService } from './application/services/cancel-order.service';
import { ExpireOrderService } from './application/services/expire-order.service';
import { ReleaseOrderService } from './application/services/release-order.service';
import { OrderReadService } from './application/services/order-read.service';
import { CreateManualOrderService } from './application/services/create-manual-order.service';
import { ConfirmManualPaymentService } from './application/services/confirm-manual-payment.service';
import { CreateInquiryService } from './application/services/create-inquiry.service';
import { ConvertInquiryService } from './application/services/convert-inquiry.service';
import { MarkInquiryLostService } from './application/services/mark-inquiry-lost.service';
import { InquiryNotificationService } from './application/services/inquiry-notification.service';
import { CheckoutController } from './presentation/http/checkout.controller';
import { BuyerOrdersController } from './presentation/http/buyer-orders.controller';
import { StoreOrdersController } from './presentation/http/store-orders.controller';
import { InquiriesController } from './presentation/http/inquiries.controller';
import { PublicInquiriesController } from './presentation/http/public-inquiries.controller';

@Module({
  imports: [
    AppConfigModule,
    StoreModule,
    CatalogModule,
    IdentityModule,
    OutboxModule,
    AuditModule,
    NotificationsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [
    CheckoutController,
    BuyerOrdersController,
    StoreOrdersController,
    InquiriesController,
    PublicInquiriesController,
  ],
  providers: [
    { provide: ORDER_REPOSITORY, useClass: OrderPrismaRepository },
    { provide: ORDER_READ_REPOSITORY, useClass: OrderReadPrismaRepository },
    { provide: INQUIRY_REPOSITORY, useClass: InquiryPrismaRepository },
    { provide: INQUIRY_READ_REPOSITORY, useClass: InquiryReadPrismaRepository },
    { provide: BUYER_DIRECTORY, useExisting: BuyerDirectoryService },
    CheckoutService,
    MarkOrderPaidService,
    CancelOrderService,
    ExpireOrderService,
    ReleaseOrderService,
    OrderReadService,
    CreateManualOrderService,
    ConfirmManualPaymentService,
    CreateInquiryService,
    ConvertInquiryService,
    MarkInquiryLostService,
    InquiryNotificationService,
  ],
  exports: [
    ORDER_REPOSITORY,
    MarkOrderPaidService,
    CancelOrderService,
    ExpireOrderService,
    ReleaseOrderService,
    OrderReadService,
    InquiryNotificationService,
  ],
})
export class OrderingModule {}
