import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { OrderingModule } from '../ordering/ordering.module';
import { CatalogModule } from '../catalog/catalog.module';
import { DIGITAL_DELIVERY_REPOSITORY } from './domain/repositories/digital-delivery.repository';
import { DIGITAL_DELIVERY_READ_REPOSITORY } from './domain/repositories/digital-delivery-read.repository';
import { DigitalDeliveryPrismaRepository } from './infrastructure/persistence/digital-delivery.prisma.repository';
import { DigitalDeliveryReadPrismaRepository } from './infrastructure/persistence/digital-delivery-read.prisma.repository';
import { DeliveryService } from './application/services/delivery.service';
import { DeliveriesController } from './presentation/http/deliveries.controller';

@Module({
  imports: [AppConfigModule, OrderingModule, CatalogModule],
  controllers: [DeliveriesController],
  providers: [
    { provide: DIGITAL_DELIVERY_REPOSITORY, useClass: DigitalDeliveryPrismaRepository },
    { provide: DIGITAL_DELIVERY_READ_REPOSITORY, useClass: DigitalDeliveryReadPrismaRepository },
    DeliveryService,
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
