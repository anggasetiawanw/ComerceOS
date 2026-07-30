import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { AppConfigService } from '../../shared/config/app-config.service';
import { STORE_REPOSITORY, StoreRepository } from './domain/repositories/store.repository';
import { UsernameAvailabilityService } from './domain/services/username-availability.service';
import { SettlementPolicyResolver } from './domain/services/settlement-policy-resolver.service';
import { StorePrismaRepository } from './infrastructure/persistence/store.prisma.repository';
import {
  USERNAME_RESERVATION_STORE,
} from './application/ports/username-reservation-store.port';
import { RedisUsernameReservationStore } from './infrastructure/redis/username-reservation.store';
import { StoreService } from './application/services/store.service';
import { StoreSettingsService } from './application/services/store-settings.service';
import { SocialLinkService } from './application/services/social-link.service';
import { StoreLookupService } from './application/services/store-lookup.service';
import { StoreUploadService } from './application/services/store-upload.service';
import { StoreOwnerGuard } from './presentation/guards/store-owner.guard';
import { StoresController } from './presentation/http/stores.controller';
import { StoreSettingsController } from './presentation/http/store-settings.controller';
import { SocialLinksController } from './presentation/http/social-links.controller';

@Module({
  imports: [AppConfigModule],
  controllers: [StoresController, StoreSettingsController, SocialLinksController],
  providers: [
    { provide: STORE_REPOSITORY, useClass: StorePrismaRepository },
    { provide: USERNAME_RESERVATION_STORE, useClass: RedisUsernameReservationStore },
    {
      provide: UsernameAvailabilityService,
      inject: [STORE_REPOSITORY],
      useFactory: (repository: StoreRepository) => new UsernameAvailabilityService(repository),
    },
    {
      provide: SettlementPolicyResolver,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new SettlementPolicyResolver({
          holdingDaysByTier: {
            low: config.holdingDaysDigital,
            medium: config.holdingDaysPhysical,
            high: config.holdingDaysService,
          },
          midtransSettlementDays: config.midtransSettlementDays,
          autoForceReleaseDays: config.autoForceReleaseDays,
        }),
    },
    StoreService,
    StoreSettingsService,
    SocialLinkService,
    StoreLookupService,
    StoreUploadService,
    StoreOwnerGuard,
  ],
  exports: [STORE_REPOSITORY, StoreService, StoreSettingsService, SocialLinkService, StoreLookupService],
})
export class StoreModule {}
