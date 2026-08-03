import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { OutboxModule } from '../../shared/infrastructure/outbox/outbox.module';
import { StoreModule } from '../store/store.module';
import { OrderingModule } from '../ordering/ordering.module';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../administration/audit.module';
import { STORE_BALANCE_REPOSITORY } from './domain/repositories/store-balance.repository';
import { BALANCE_TRANSACTION_REPOSITORY } from './domain/repositories/balance-transaction.repository';
import { BALANCE_READ_REPOSITORY } from './domain/repositories/balance-read.repository';
import { BANK_ACCOUNT_REPOSITORY } from './domain/repositories/bank-account.repository';
import { WITHDRAWAL_REPOSITORY } from './domain/repositories/withdrawal.repository';
import { WITHDRAWAL_READ_REPOSITORY } from './domain/repositories/withdrawal-read.repository';
import { StoreBalancePrismaRepository } from './infrastructure/persistence/store-balance.prisma.repository';
import { BalanceTransactionPrismaRepository } from './infrastructure/persistence/balance-transaction.prisma.repository';
import { BalanceReadPrismaRepository } from './infrastructure/persistence/balance-read.prisma.repository';
import { BankAccountPrismaRepository } from './infrastructure/persistence/bank-account.prisma.repository';
import { WithdrawalPrismaRepository } from './infrastructure/persistence/withdrawal.prisma.repository';
import { WithdrawalReadPrismaRepository } from './infrastructure/persistence/withdrawal-read.prisma.repository';
import { LedgerService } from './application/services/ledger.service';
import { BalanceReadService } from './application/services/balance-read.service';
import { BankAccountService } from './application/services/bank-account.service';
import { WithdrawalService } from './application/services/withdrawal.service';
import { WithdrawalReadService } from './application/services/withdrawal-read.service';
import { WithdrawalNotificationService } from './application/services/withdrawal-notification.service';
import { BalanceController } from './presentation/http/balance.controller';
import { BankAccountsController } from './presentation/http/bank-accounts.controller';
import { WithdrawalsController } from './presentation/http/withdrawals.controller';

@Module({
  imports: [AppConfigModule, StoreModule, OrderingModule, IdentityModule, NotificationsModule, AuditModule, OutboxModule],
  controllers: [BalanceController, BankAccountsController, WithdrawalsController],
  providers: [
    { provide: STORE_BALANCE_REPOSITORY, useClass: StoreBalancePrismaRepository },
    { provide: BALANCE_TRANSACTION_REPOSITORY, useClass: BalanceTransactionPrismaRepository },
    { provide: BALANCE_READ_REPOSITORY, useClass: BalanceReadPrismaRepository },
    { provide: BANK_ACCOUNT_REPOSITORY, useClass: BankAccountPrismaRepository },
    { provide: WITHDRAWAL_REPOSITORY, useClass: WithdrawalPrismaRepository },
    { provide: WITHDRAWAL_READ_REPOSITORY, useClass: WithdrawalReadPrismaRepository },
    LedgerService,
    BalanceReadService,
    BankAccountService,
    WithdrawalService,
    WithdrawalReadService,
    WithdrawalNotificationService,
  ],
  exports: [LedgerService, WithdrawalService, WithdrawalReadService, BankAccountService, WithdrawalNotificationService],
})
export class LedgerModule {}
