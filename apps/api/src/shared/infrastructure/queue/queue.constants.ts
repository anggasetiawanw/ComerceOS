export const QUEUE_NAMES = {
  PAYMENT: 'payment',
  ORDER: 'order',
  OUTBOX: 'outbox',
  DELIVERY: 'delivery',
  LEDGER: 'ledger',
  INVOICE: 'invoice',
  NOTIFICATION: 'notification',
  CRM: 'crm',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  PROCESS_WEBHOOK: 'process-webhook',
  EXPIRE_ORDERS: 'expire-orders',
  RELAY_OUTBOX_EVENTS: 'relay-outbox-events',
  PROVISION_DIGITAL_DELIVERY: 'provision-digital-delivery',
  CREDIT_HOLDING_BALANCE: 'credit-holding-balance',
  RELEASE_TO_AVAILABLE: 'release-to-available',
  RELEASE_HOLDING_BALANCE: 'release-holding-balance',
  GENERATE_INVOICE: 'generate-invoice',
  DELIVER_INVOICE: 'deliver-invoice',
  UPSERT_STORE_BUYER: 'upsert-store-buyer',
  SEND_EMAIL: 'send-email',
  DISPATCH_WITHDRAWAL_NOTIFICATION: 'dispatch-withdrawal-notification',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

// Fixed repeatable-job ids so a redeploy never accumulates duplicate
// schedulers (.docs/10-background-jobs.md §4) — BullMQ dedupes on this id.
// BullMQ rejects ':' in custom job/scheduler ids, so '-' separates the parts.
export const REPEATABLE_JOB_IDS = {
  RELAY_OUTBOX_EVENTS: 'repeatable-relay-outbox-events',
  EXPIRE_ORDERS: 'repeatable-expire-orders',
  RELEASE_HOLDING_BALANCE: 'repeatable-release-holding-balance',
} as const;
