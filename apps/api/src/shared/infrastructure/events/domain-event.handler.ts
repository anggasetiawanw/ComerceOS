import { DomainEvent } from '../../kernel/domain-event.base';

export interface DomainEventHandler<TEvent extends DomainEvent = DomainEvent> {
  handle(event: TEvent): Promise<void>;
}
