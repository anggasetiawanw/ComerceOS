import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { ORDERING_EVENT_NAMES } from './ordering-event-names';

export class InquiryMarkedLostEvent extends DomainEvent {
  constructor(
    readonly inquiryId: string,
    readonly storeId: string,
  ) {
    super();
  }

  get eventName(): string {
    return ORDERING_EVENT_NAMES.INQUIRY_MARKED_LOST;
  }
}
