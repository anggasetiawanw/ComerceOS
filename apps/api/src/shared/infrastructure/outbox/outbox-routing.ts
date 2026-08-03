import { JobName, JOB_NAMES, QueueName, QUEUE_NAMES } from '../queue/queue.constants';
import { ORDERING_EVENT_NAMES } from '../../../modules/ordering/domain/events/ordering-event-names';

export interface OutboxRoute {
  queue: QueueName;
  jobName: JobName;
}

// Not every outbox event has a consumer yet — an event without a route is
// still marked published by the relay, it just has nowhere to go this
// sprint (e.g. OrderReleased routes to the ledger queue from Sprint 6).
// This is what lets future sprints add consumers without touching the
// relay itself.
export const OUTBOX_ROUTES: Readonly<Partial<Record<string, OutboxRoute>>> = {
  [ORDERING_EVENT_NAMES.ORDER_PAID]: { queue: QUEUE_NAMES.DELIVERY, jobName: JOB_NAMES.PROVISION_DIGITAL_DELIVERY },
};
