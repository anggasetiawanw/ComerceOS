import { JobName, JOB_NAMES, QueueName, QUEUE_NAMES } from '../queue/queue.constants';
import { ORDERING_EVENT_NAMES } from '../../../modules/ordering/domain/events/ordering-event-names';
import { INVOICING_EVENT_NAMES } from '../../../modules/invoicing/domain/events/invoicing-event-names';

export interface OutboxRouteBackoff {
  type: 'exponential';
  delay: number;
}

export interface OutboxRoute {
  queue: QueueName;
  jobName: JobName;
  opts?: { attempts: number; backoff: OutboxRouteBackoff };
}

// One outbox event can now fan out to multiple consumers — ordering.order_paid
// alone drives delivery, ledger, invoicing and crm. An event without any
// route is still marked published by the relay; it just has nowhere to go
// yet (e.g. ordering.order_disputed, which no Sprint 6 consumer reads).
// Per-job retry policy lives on the route so .docs/09-payments-ledger.md
// §10's retry table is one readable block instead of scattered call sites.
export const OUTBOX_ROUTES: Readonly<Partial<Record<string, readonly OutboxRoute[]>>> = {
  [ORDERING_EVENT_NAMES.ORDER_PAID]: [
    {
      queue: QUEUE_NAMES.DELIVERY,
      jobName: JOB_NAMES.PROVISION_DIGITAL_DELIVERY,
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
    },
    {
      queue: QUEUE_NAMES.LEDGER,
      jobName: JOB_NAMES.CREDIT_HOLDING_BALANCE,
      opts: { attempts: 5, backoff: { type: 'exponential', delay: 2_000 } },
    },
    {
      queue: QUEUE_NAMES.INVOICE,
      jobName: JOB_NAMES.GENERATE_INVOICE,
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
    },
    {
      queue: QUEUE_NAMES.CRM,
      jobName: JOB_NAMES.UPSERT_STORE_BUYER,
      opts: { attempts: 5, backoff: { type: 'exponential', delay: 5_000 } },
    },
  ],
  [ORDERING_EVENT_NAMES.ORDER_RELEASED]: [
    {
      queue: QUEUE_NAMES.LEDGER,
      jobName: JOB_NAMES.RELEASE_TO_AVAILABLE,
      opts: { attempts: 5, backoff: { type: 'exponential', delay: 2_000 } },
    },
  ],
  [INVOICING_EVENT_NAMES.INVOICE_GENERATED]: [
    {
      queue: QUEUE_NAMES.INVOICE,
      jobName: JOB_NAMES.DELIVER_INVOICE,
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
    },
  ],
};
