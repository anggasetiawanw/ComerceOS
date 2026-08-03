import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { StoreModule } from '../store/store.module';
import { AuditModule } from '../administration/audit.module';
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository';
import { ProductRiskTierResolver } from './domain/services/product-risk-tier.resolver';
import { ProductPrismaRepository } from './infrastructure/persistence/product.prisma.repository';
import { ProductService } from './application/services/product.service';
import { ProductMediaService } from './application/services/product-media.service';
import { DigitalFileService } from './application/services/digital-file.service';
import { ProductsController } from './presentation/http/products.controller';
import { ProductImagesController } from './presentation/http/product-images.controller';
import { DigitalFilesController } from './presentation/http/digital-files.controller';

@Module({
  imports: [AppConfigModule, StoreModule, AuditModule],
  controllers: [ProductsController, ProductImagesController, DigitalFilesController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: ProductPrismaRepository },
    { provide: ProductRiskTierResolver, useFactory: () => new ProductRiskTierResolver() },
    ProductService,
    ProductMediaService,
    DigitalFileService,
  ],
  exports: [PRODUCT_REPOSITORY, ProductRiskTierResolver, ProductService],
})
export class CatalogModule {}
