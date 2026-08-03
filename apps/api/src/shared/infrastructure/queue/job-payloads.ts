export interface ProcessWebhookJob {
  webhookEventId: string;
}

export interface ExpireOrdersJob {
  batchSize: number;
}

export interface RelayOutboxEventsJob {
  batchSize: number;
}

export interface ProvisionDigitalDeliveryJob {
  orderId: string;
}

// Outbox-routed job payloads are forwarded verbatim from the triggering
// event's toPayload() (see outbox-relay.processor.ts), so each interface
// here must be a structural subset of its source event's payload.
export interface CreditHoldingBalanceJob {
  orderId: string;
  storeId: string;
}

export interface ReleaseToAvailableJob {
  orderId: string;
  storeId: string;
}

export interface ReleaseHoldingBalanceJob {
  batchSize: number;
}

export interface GenerateInvoiceJob {
  orderId: string;
  storeId: string;
  buyerId: string;
}

export interface DeliverInvoiceJob {
  invoiceId: string;
  orderId: string;
}

export interface UpsertStoreBuyerJob {
  orderId: string;
  storeId: string;
  buyerId: string;
}

// Not outbox-routed — enqueued directly by NotificationDispatcher with just
// the delivery row id, keeping the queue message tiny and the full payload
// in notification_deliveries for Sprint 12's retry job/admin viewer.
export interface SendEmailJob {
  deliveryId: string;
}

// Outbox-routed from all three ledger.withdrawal_* events onto one job name
// — the `template` field (set in each event's toPayload()) is how
// NotificationQueueProcessor/WithdrawalNotificationService tell them apart,
// since the relay forwards payload verbatim with no per-route transform.
export interface DispatchWithdrawalNotificationJob {
  withdrawalId: string;
  storeId: string;
  amount: string;
  template: 'withdrawal_requested' | 'withdrawal_paid' | 'withdrawal_rejected';
  reason?: string | null;
}
