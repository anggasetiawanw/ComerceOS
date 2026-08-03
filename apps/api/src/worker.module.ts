import { Module } from '@nestjs/common';
import { AppConfigModule } from './shared/config/app-config.module';
import { LoggerModule } from './shared/observability/logger.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { RedisModule } from './shared/infrastructure/redis/redis.module';
import { EventsModule } from './shared/infrastructure/events/events.module';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { AppJwtModule } from './shared/security/jwt.module';
import { IdempotencyModule } from './shared/infrastructure/idempotency/idempotency.module';
import { OutboxRelayModule } from './shared/infrastructure/outbox/outbox-relay.module';
import { RepeatableJobsModule } from './shared/infrastructure/queue/repeatable-jobs.module';
import { OrderingJobsModule } from './modules/ordering/ordering-jobs.module';
import { PaymentsJobsModule } from './modules/payments/payments-jobs.module';
import { DeliveryJobsModule } from './modules/delivery/delivery-jobs.module';
import { LedgerJobsModule } from './modules/ledger/ledger-jobs.module';
import { InvoicingJobsModule } from './modules/invoicing/invoicing-jobs.module';
import { CrmJobsModule } from './modules/crm/crm-jobs.module';
import { NotificationsJobsModule } from './modules/notifications/notifications-jobs.module';

// Second entrypoint into the same @nagihin/api package (worker.main.ts),
// not a separate apps/worker package. It boots via
// NestFactory.createApplicationContext — a separate process and container
// from the HTTP API (same event-loop-isolation rationale as
// .docs/02-architecture.md §6), but with full access to the domain modules
// BullMQ processors need, and zero duplicated config/Prisma/Redis wiring.
@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    PrismaModule,
    RedisModule,
    EventsModule,
    StorageModule,
    AppJwtModule,
    IdempotencyModule,
    OutboxRelayModule,
    RepeatableJobsModule,
    OrderingJobsModule,
    PaymentsJobsModule,
    DeliveryJobsModule,
    LedgerJobsModule,
    InvoicingJobsModule,
    CrmJobsModule,
    NotificationsJobsModule,
  ],
})
export class WorkerModule {}
