import { Prisma, WebhookEvent as PrismaWebhookEvent } from '@prisma/client';
import { WebhookEvent, WebhookEventStatusValue } from '../../domain/entities/webhook-event.entity';

export class WebhookEventMapper {
  static toDomain(row: PrismaWebhookEvent): WebhookEvent {
    return WebhookEvent.reconstitute(
      {
        source: row.source,
        eventType: row.eventType,
        payload: row.payload as Record<string, unknown>,
        orderId: row.orderId,
        transactionId: row.transactionId,
        transactionStatus: row.transactionStatus,
        status: row.status as WebhookEventStatusValue,
        errorMessage: row.errorMessage,
        receivedAt: row.receivedAt,
        processedAt: row.processedAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(event: WebhookEvent): Prisma.WebhookEventUncheckedCreateInput {
    return {
      id: event.id,
      source: event.source,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonValue,
      orderId: event.orderId,
      transactionId: event.transactionId,
      transactionStatus: event.transactionStatus,
      status: event.status,
      errorMessage: event.errorMessage,
      receivedAt: event.receivedAt,
      processedAt: event.processedAt,
    };
  }

  static toPersistenceUpdate(event: WebhookEvent): Prisma.WebhookEventUncheckedUpdateInput {
    return {
      orderId: event.orderId,
      status: event.status,
      errorMessage: event.errorMessage,
      processedAt: event.processedAt,
    };
  }
}
