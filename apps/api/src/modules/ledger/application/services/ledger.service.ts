import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { OrderReadService } from '../../../ordering/application/services/order-read.service';
import { OrderStatusValue } from '../../../ordering/domain/value-objects/order-status.vo';
import { StoreBalance } from '../../domain/entities/store-balance.aggregate';
import { STORE_BALANCE_REPOSITORY, StoreBalanceRepository } from '../../domain/repositories/store-balance.repository';
import {
  BALANCE_TRANSACTION_REPOSITORY,
  BalanceTransactionRepository,
} from '../../domain/repositories/balance-transaction.repository';
import { InsufficientHoldingBalanceError, OrderNotEligibleForLedgerError, StoreBalanceNotFoundError } from '../../domain/errors/ledger.errors';

type LedgerMutationError = OrderNotEligibleForLedgerError | StoreBalanceNotFoundError | InsufficientHoldingBalanceError;

// A redelivered ordering.order_paid after a future refund (Sprint 11) must
// not re-credit a refunded order — the order is re-read on every call since
// the outbox payload carries no money amounts, so status is re-checked here
// rather than trusted from the event.
const CREDIT_ELIGIBLE_STATUSES: readonly OrderStatusValue[] = ['paid', 'holding', 'released'];
const RELEASE_ELIGIBLE_STATUSES: readonly OrderStatusValue[] = ['released'];

// The only application service that may call StoreBalanceRepository.save —
// stores.holding_balance/available_balance are ledger-owned columns on a
// Store-owned row (.docs/03-bounded-contexts.md §3.6), and this is the
// "private to a single ledger service" half of that rule.
@Injectable()
export class LedgerService {
  constructor(
    @Inject(STORE_BALANCE_REPOSITORY) private readonly balances: StoreBalanceRepository,
    @Inject(BALANCE_TRANSACTION_REPOSITORY) private readonly transactions: BalanceTransactionRepository,
    private readonly orderReads: OrderReadService,
    private readonly transactionManager: TransactionManager,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async creditHoldingForOrder(orderId: string): Promise<Result<void, LedgerMutationError>> {
    return this.transactionManager.runInTransaction(async () => {
      const order = await this.orderReads.findById(orderId);
      if (!order) return Result.err(new OrderNotEligibleForLedgerError(orderId, 'order not found'));
      if (!CREDIT_ELIGIBLE_STATUSES.includes(order.status.value)) {
        return Result.err(new OrderNotEligibleForLedgerError(orderId, `status is "${order.status.value}"`));
      }

      // Lock first, then check — matching StoreBalance's role as the
      // concurrency boundary (.docs/09 §4).
      const balance = await this.balances.findForUpdate(order.storeId);
      if (!balance) return Result.err(new StoreBalanceNotFoundError());

      const alreadyCredited = await this.transactions.existsFor(orderId, 'order_paid_holding');
      if (alreadyCredited) return Result.ok(undefined);

      const net = order.total.subtract(order.fee.amount).unwrap();
      balance.creditHolding({ orderId, amount: net });

      await this.persist(balance);
      return Result.ok(undefined);
    });
  }

  async releaseToAvailableForOrder(orderId: string): Promise<Result<void, LedgerMutationError>> {
    return this.transactionManager.runInTransaction(async () => {
      const order = await this.orderReads.findById(orderId);
      if (!order) return Result.err(new OrderNotEligibleForLedgerError(orderId, 'order not found'));
      if (!RELEASE_ELIGIBLE_STATUSES.includes(order.status.value)) {
        return Result.err(new OrderNotEligibleForLedgerError(orderId, `status is "${order.status.value}"`));
      }

      const balance = await this.balances.findForUpdate(order.storeId);
      if (!balance) return Result.err(new StoreBalanceNotFoundError());

      const alreadyReleased = await this.transactions.existsFor(orderId, 'order_released');
      if (alreadyReleased) return Result.ok(undefined);

      const net = order.total.subtract(order.fee.amount).unwrap();
      const result = balance.releaseToAvailable({ orderId, amount: net });
      if (result.isErr()) return Result.err(result.unwrapErr());

      await this.persist(balance);
      return Result.ok(undefined);
    });
  }

  private async persist(balance: StoreBalance): Promise<void> {
    await this.balances.save(balance);
    await this.transactions.append(balance.pullPendingEntries());
    await this.eventPublisher.publishAll(balance.pullDomainEvents());
  }
}
