import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './shared/config/app-config.module';
import { LoggerModule } from './shared/observability/logger.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { RedisModule } from './shared/infrastructure/redis/redis.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { EventsModule } from './shared/infrastructure/events/events.module';
import { StorageModule } from './shared/infrastructure/storage/storage.module';
import { IdempotencyModule } from './shared/infrastructure/idempotency/idempotency.module';
import { HealthModule } from './shared/observability/health/health.module';
import { AppJwtModule } from './shared/security/jwt.module';
import { AppThrottlerModule } from './shared/security/app-throttler.module';
import { JwtAuthGuard } from './shared/presentation/guards/jwt-auth.guard';
import { RolesGuard } from './shared/presentation/guards/roles.guard';
import { IdentityModule } from './modules/identity/identity.module';
import { StoreModule } from './modules/store/store.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { OrderingModule } from './modules/ordering/ordering.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DeliveryModule } from './modules/delivery/delivery.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    PrismaModule,
    RedisModule,
    CacheModule,
    EventsModule,
    StorageModule,
    IdempotencyModule,
    AppJwtModule,
    AppThrottlerModule,
    HealthModule,
    StoreModule,
    CatalogModule,
    IdentityModule,
    StorefrontModule,
    OrderingModule,
    PaymentsModule,
    DeliveryModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
