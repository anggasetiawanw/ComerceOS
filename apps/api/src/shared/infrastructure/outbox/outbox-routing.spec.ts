import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';
import { OUTBOX_ROUTES } from './outbox-routing';

// Guards against "added a route, forgot to inject the queue in
// OutboxRelayProcessor" — a mistake that would otherwise only surface as a
// thrown error in production at relay time. OutboxRelayProcessor wires one
// queue per QUEUE_NAMES entry, so every route's queue must be a known name.
describe('OUTBOX_ROUTES', () => {
  const allQueueNames = Object.values(QUEUE_NAMES);
  const allJobNames = Object.values(JOB_NAMES);

  it('routes only to queues the relay has a producer for', () => {
    for (const routes of Object.values(OUTBOX_ROUTES)) {
      for (const route of routes ?? []) {
        expect(allQueueNames).toContain(route.queue);
      }
    }
  });

  it('routes only to known job names', () => {
    for (const routes of Object.values(OUTBOX_ROUTES)) {
      for (const route of routes ?? []) {
        expect(allJobNames).toContain(route.jobName);
      }
    }
  });

  it('never routes the same event to the same queue twice', () => {
    for (const routes of Object.values(OUTBOX_ROUTES)) {
      const queues = (routes ?? []).map((route) => route.queue);
      expect(new Set(queues).size).toBe(queues.length);
    }
  });
});
