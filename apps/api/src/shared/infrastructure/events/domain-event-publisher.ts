import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../../kernel/domain-event.base';
import { DomainEventHandler } from './domain-event.handler';

@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe(eventName: string, handler: DomainEventHandler): void {
    const existing = this.handlers.get(eventName);
    if (existing) {
      existing.add(handler);
      return;
    }
    this.handlers.set(eventName, new Set([handler]));
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  private async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        this.logger.error(
          `Handler for domain event "${event.eventName}" failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
