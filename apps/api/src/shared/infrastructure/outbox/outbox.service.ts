import { Injectable } from '@nestjs/common';
import { DomainEvent } from '../../kernel/domain-event.base';
import { OutboxDomainEvent } from '../../kernel/outbox-domain-event.base';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxService {
  constructor(private readonly repository: OutboxRepository) {}

  // Accepts the full pulled-events array from an aggregate (mixed event
  // types) and enqueues only the outbox-worthy ones — lets a call site write
  // `outbox.enqueueAll(aggregate.pullDomainEvents())` without narrowing.
  async enqueueAll(events: readonly DomainEvent[]): Promise<void> {
    const outboxEvents = events.filter((event): event is OutboxDomainEvent => event instanceof OutboxDomainEvent);
    await this.repository.enqueue(outboxEvents);
  }
}
