import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { StoreModule } from '../store/store.module';
import { OrderingModule } from '../ordering/ordering.module';
import { STORE_BALANCE_REPOSITORY } from './domain/repositories/store-balance.repository';
import { BALANCE_TRANSACTION_REPOSITORY } from './domain/repositories/balance-transaction.repository';
import { BALANCE_READ_REPOSITORY } from './domain/repositories/balance-read.repository';
import { StoreBalancePrismaRepository } from './infrastructure/persistence/store-balance.prisma.repository';
import { BalanceTransactionPrismaRepository } from './infrastructure/persistence/balance-transaction.prisma.repository';
import { BalanceReadPrismaRepository } from './infrastructure/persistence/balance-read.prisma.repository';
import { LedgerService } from './application/services/ledger.service';
import { BalanceReadService } from './application/services/balance-read.service';
import { BalanceController } from './presentation/http/balance.controller';

@Module({
  imports: [AppConfigModule, StoreModule, OrderingModule],
  controllers: [BalanceController],
  providers: [
    { provide: STORE_BALANCE_REPOSITORY, useClass: StoreBalancePrismaRepository },
    { provide: BALANCE_TRANSACTION_REPOSITORY, useClass: BalanceTransactionPrismaRepository },
    { provide: BALANCE_READ_REPOSITORY, useClass: BalanceReadPrismaRepository },
    LedgerService,
    BalanceReadService,
  ],
  exports: [LedgerService],
})
export class LedgerModule {}
