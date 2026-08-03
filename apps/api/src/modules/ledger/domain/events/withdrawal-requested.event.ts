import { OutboxDomainEvent } from '../../../../shared/kernel/outbox-domain-event.base';
import { LEDGER_EVENT_NAMES } from './ledger-event-names';

export class WithdrawalRequestedEvent extends OutboxDomainEvent {
  constructor(
    readonly withdrawalId: string,
    readonly storeId: string,
    readonly amount: string,
  ) {
    super();
  }

  get eventName(): string {
    return LEDGER_EVENT_NAMES.WITHDRAWAL_REQUESTED;
  }

  get aggregateType(): string {
    return 'withdrawal';
  }

  get aggregateId(): string {
    return this.withdrawalId;
  }

  toPayload(): Record<string, unknown> {
    return {
      withdrawalId: this.withdrawalId,
      storeId: this.storeId,
      amount: this.amount,
      template: 'withdrawal_requested',
    };
  }
}
