import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { AUDIT_LOG_PORT, AuditLogPort } from '../../../administration/application/ports/audit-log.port';
import { Store } from '../../domain/entities/store.aggregate';
import { STORE_REPOSITORY, StoreRepository } from '../../domain/repositories/store.repository';
import { SettlementMode, SettlementModeError } from '../../domain/value-objects/settlement-mode.vo';
import { SettlementPolicy } from '../../domain/value-objects/settlement-policy.vo';
import { SettlementPolicyResolver } from '../../domain/services/settlement-policy-resolver.service';
import { StoreNotFoundError } from '../../domain/errors/store.errors';

export interface StoreSettings {
  store: Store;
  policy: SettlementPolicy;
}

@Injectable()
export class StoreSettingsService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: AuditLogPort,
    private readonly settlementPolicyResolver: SettlementPolicyResolver,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async getSettings(ownerId: string): Promise<Result<StoreSettings, StoreNotFoundError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    return Result.ok({
      store,
      policy: this.settlementPolicyResolver.resolve(store.settlementMode),
    });
  }

  async changeSettlementMode(
    ownerId: string,
    mode: string,
  ): Promise<Result<StoreSettings, StoreNotFoundError | SettlementModeError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const modeResult = SettlementMode.create(mode);
    if (modeResult.isErr()) return Result.err(modeResult.unwrapErr());

    const previousMode = store.settlementMode.value;
    store.changeSettlementMode(modeResult.unwrap());

    await this.transactionManager.runInTransaction(async () => {
      await this.stores.save(store);
      await this.auditLog.record({
        actorType: 'user',
        actorId: ownerId,
        action: 'store.settlement_mode_changed',
        entityType: 'store',
        entityId: store.id,
        metadata: { before: previousMode, after: modeResult.unwrap().value },
      });
    });
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok({
      store,
      policy: this.settlementPolicyResolver.resolve(store.settlementMode),
    });
  }
}
