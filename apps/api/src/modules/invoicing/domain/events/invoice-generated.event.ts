import { OutboxDomainEvent } from '../../../../shared/kernel/outbox-domain-event.base';
import { INVOICING_EVENT_NAMES } from './invoicing-event-names';

export class InvoiceGeneratedEvent extends OutboxDomainEvent {
  constructor(
    readonly invoiceId: string,
    readonly orderId: string,
    readonly storeId: string,
  ) {
    super();
  }

  get eventName(): string {
    return INVOICING_EVENT_NAMES.INVOICE_GENERATED;
  }

  get aggregateType(): string {
    return 'invoice';
  }

  get aggregateId(): string {
    return this.invoiceId;
  }

  toPayload(): Record<string, unknown> {
    return { invoiceId: this.invoiceId, orderId: this.orderId, storeId: this.storeId };
  }
}
