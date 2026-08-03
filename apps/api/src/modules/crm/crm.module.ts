import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { STORE_BUYER_REPOSITORY } from './domain/repositories/store-buyer.repository';
import { STORE_BUYER_READ_REPOSITORY } from './domain/repositories/store-buyer-read.repository';
import { StoreBuyerPrismaRepository } from './infrastructure/persistence/store-buyer.prisma.repository';
import { StoreBuyerReadPrismaRepository } from './infrastructure/persistence/store-buyer-read.prisma.repository';
import { StoreBuyerService } from './application/services/store-buyer.service';
import { BuyersController } from './presentation/http/buyers.controller';

@Module({
  imports: [StoreModule],
  controllers: [BuyersController],
  providers: [
    { provide: STORE_BUYER_REPOSITORY, useClass: StoreBuyerPrismaRepository },
    { provide: STORE_BUYER_READ_REPOSITORY, useClass: StoreBuyerReadPrismaRepository },
    StoreBuyerService,
  ],
  exports: [StoreBuyerService],
})
export class CrmModule {}
