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
