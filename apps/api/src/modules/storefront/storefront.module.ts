import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { STOREFRONT_READ_REPOSITORY } from './application/ports/storefront-read.repository';
import { StorefrontReadPrismaRepository } from './infrastructure/persistence/storefront-read.prisma.repository';
import { StorefrontService } from './application/services/storefront.service';
import { StorefrontCacheInvalidator } from './application/services/storefront-cache.invalidator';
import { StorefrontController } from './presentation/http/storefront.controller';

@Module({
  imports: [AppConfigModule],
  controllers: [StorefrontController],
  providers: [
    { provide: STOREFRONT_READ_REPOSITORY, useClass: StorefrontReadPrismaRepository },
    StorefrontService,
    StorefrontCacheInvalidator,
  ],
})
export class StorefrontModule {}
