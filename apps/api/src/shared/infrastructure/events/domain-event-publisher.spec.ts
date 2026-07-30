import { DomainEvent } from '../../kernel/domain-event.base';
import { DomainEventHandler } from './domain-event.handler';
import { DomainEventPublisher } from './domain-event-publisher';

class TestEvent extends DomainEvent {
  constructor() {
    super();
  }

  get eventName(): string {
    return 'test.event';
  }
}

class OtherEvent extends DomainEvent {
  constructor() {
    super();
  }

  get eventName(): string {
    return 'other.event';
  }
}

describe('DomainEventPublisher', () => {
  it('routes events to handlers subscribed to the matching event name', async () => {
    const publisher = new DomainEventPublisher();
    const calls: string[] = [];
    const handler: DomainEventHandler = {
      handle: async (event) => {
        calls.push(event.eventName);
      },
    };
    publisher.subscribe('test.event', handler);

    await publisher.publishAll([new TestEvent(), new OtherEvent()]);

    expect(calls).toEqual(['test.event']);
  });

  it('runs every handler subscribed to the same event name', async () => {
    const publisher = new DomainEventPublisher();
    const calls: string[] = [];
    publisher.subscribe('test.event', { handle: async () => void calls.push('a') });
    publisher.subscribe('test.event', { handle: async () => void calls.push('b') });

    await publisher.publishAll([new TestEvent()]);

    expect(calls.sort()).toEqual(['a', 'b']);
  });

  it('a throwing handler does not reject publishAll and does not stop the others', async () => {
    const publisher = new DomainEventPublisher();
    const calls: string[] = [];
    publisher.subscribe('test.event', {
      handle: async () => {
        throw new Error('boom');
      },
    });
    publisher.subscribe('test.event', { handle: async () => void calls.push('survivor') });

    await expect(publisher.publishAll([new TestEvent()])).resolves.toBeUndefined();
    expect(calls).toEqual(['survivor']);
  });
});
