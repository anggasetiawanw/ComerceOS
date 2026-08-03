import { forwardRef, Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { AppConfigService } from '../../shared/config/app-config.service';
import { QueueModule } from '../../shared/infrastructure/queue/queue.module';
import { OrderingModule } from '../ordering/ordering.module';
import { IdentityModule } from '../identity/identity.module';
import { PAYMENT_GATEWAY } from '../ordering/application/ports/payment-gateway.port';
import { WEBHOOK_EVENT_REPOSITORY } from './domain/repositories/webhook-event.repository';
import { WebhookEventPrismaRepository } from './infrastructure/persistence/webhook-event.prisma.repository';
import { SignatureVerifier } from './domain/services/signature-verifier';
import { PaymentStatusMapper } from './domain/services/payment-status.mapper';
import { MidtransSnapGateway } from './infrastructure/gateway/midtrans-snap.gateway';
import { StubSnapGateway } from './infrastructure/gateway/stub-snap.gateway';
import { WebhookIngestionService } from './application/services/webhook-ingestion.service';
import { WebhookProcessingService } from './application/services/webhook-processing.service';
import { SnapTokenService } from './application/services/snap-token.service';
import { MidtransWebhookController } from './presentation/http/midtrans-webhook.controller';
import { PaymentsController } from './presentation/http/payments.controller';
import { DevWebhookController } from './presentation/http/dev-webhook.controller';

// forwardRef both ways with OrderingModule: checkout (ordering) needs
// PAYMENT_GATEWAY (payments), and webhook processing (payments) needs
// MarkOrderPaidService/CancelOrderService (ordering) — a genuine
// bidirectional runtime dependency, not an accident of file layout.
@Module({
  imports: [AppConfigModule, QueueModule, forwardRef(() => OrderingModule), IdentityModule],
  controllers: [MidtransWebhookController, PaymentsController, DevWebhookController],
  providers: [
    { provide: WEBHOOK_EVENT_REPOSITORY, useClass: WebhookEventPrismaRepository },
    SignatureVerifier,
    PaymentStatusMapper,
    MidtransSnapGateway,
    StubSnapGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [AppConfigService, MidtransSnapGateway, StubSnapGateway],
      useFactory: (config: AppConfigService, midtrans: MidtransSnapGateway, stub: StubSnapGateway) =>
        config.isMidtransConfigured ? midtrans : stub,
    },
    WebhookIngestionService,
    WebhookProcessingService,
    SnapTokenService,
  ],
  exports: [PAYMENT_GATEWAY, WebhookProcessingService],
})
export class PaymentsModule {}
