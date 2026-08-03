import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { NotificationDispatcher } from '../../../notifications/application/services/notification-dispatcher.service';
import { NOTIFICATION_TEMPLATES } from '../../../notifications/domain/value-objects/notification-templates';
import { STORE_REPOSITORY, StoreRepository } from '../../../store/domain/repositories/store.repository';
import { USER_REPOSITORY, UserRepository } from '../../../identity/domain/repositories/user.repository';

export interface DispatchWithdrawalNotificationInput {
  withdrawalId: string;
  storeId: string;
  amount: string;
  template: 'withdrawal_requested' | 'withdrawal_paid' | 'withdrawal_rejected';
  reason?: string | null;
}

// One job name, three templates — the outbox relay forwards each
// ledger.withdrawal_* event's payload verbatim, and the `template` field set
// in the event's own toPayload() is what tells the three apart
// (shared/infrastructure/queue/job-payloads.ts).
@Injectable()
export class WithdrawalNotificationService {
  private readonly logger = new Logger(WithdrawalNotificationService.name);

  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly dispatcher: NotificationDispatcher,
    private readonly config: AppConfigService,
  ) {}

  async dispatch(input: DispatchWithdrawalNotificationInput): Promise<void> {
    const store = await this.stores.findById(input.storeId);
    if (!store) {
      this.logger.warn(`dispatch-withdrawal-notification: store "${input.storeId}" not found`);
      return;
    }

    if (input.template === 'withdrawal_requested') {
      if (!this.config.isAdminAlertConfigured) return;
      await this.dispatcher.dispatch({
        template: NOTIFICATION_TEMPLATES.WITHDRAWAL_REQUESTED,
        recipient: { email: this.config.adminAlertEmail, phone: null },
        payload: {
          storeName: store.profile.displayName,
          amountRupiah: input.amount,
          withdrawalId: input.withdrawalId,
        },
      });
      return;
    }

    const owner = await this.users.findById(store.ownerId);
    if (!owner) {
      this.logger.warn(`dispatch-withdrawal-notification: owner for store "${input.storeId}" not found`);
      return;
    }

    if (input.template === 'withdrawal_paid') {
      await this.dispatcher.dispatch({
        template: NOTIFICATION_TEMPLATES.WITHDRAWAL_PAID,
        recipient: { email: owner.email.value, phone: null },
        payload: {
          sellerName: owner.name,
          storeName: store.profile.displayName,
          amountRupiah: input.amount,
        },
      });
      return;
    }

    await this.dispatcher.dispatch({
      template: NOTIFICATION_TEMPLATES.WITHDRAWAL_REJECTED,
      recipient: { email: owner.email.value, phone: null },
      payload: {
        sellerName: owner.name,
        storeName: store.profile.displayName,
        amountRupiah: input.amount,
        reason: input.reason ?? null,
      },
    });
  }
}
