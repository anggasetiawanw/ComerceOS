import { DomainEvent } from './domain-event.base';

export abstract class OutboxDomainEvent extends DomainEvent {
  abstract get aggregateType(): string;
  abstract get aggregateId(): string;
  abstract toPayload(): Record<string, unknown>;
}
