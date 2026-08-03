import { Prisma, NotificationDelivery as PrismaNotificationDelivery } from '@prisma/client';
import { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';

// payload casts at the Json boundary match the precedent in
// webhook-event.mapper.ts and outbox.repository.ts: Prisma's JsonValue and
// InputJsonValue types are structurally compatible with
// Record<string, unknown> but not nominally identical, so this is the one
// serialization boundary where that contract meets Prisma's stricter shape.
export class NotificationDeliveryMapper {
  static toDomain(row: PrismaNotificationDelivery): NotificationDelivery {
    return NotificationDelivery.reconstitute(
      {
        channel: row.channel,
        provider: row.provider,
        recipient: row.recipient,
        template: row.template,
        payload: row.payload as Record<string, unknown>,
        status: row.status,
        attempts: row.attempts,
        errorMessage: row.errorMessage,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistence(delivery: NotificationDelivery): Prisma.NotificationDeliveryUncheckedCreateInput {
    return {
      id: delivery.id,
      channel: delivery.channel,
      provider: delivery.provider,
      recipient: delivery.recipient,
      template: delivery.template,
      payload: delivery.payload as Prisma.InputJsonValue,
      status: delivery.status,
      attempts: delivery.attempts,
      errorMessage: delivery.errorMessage,
      sentAt: delivery.sentAt,
      createdAt: delivery.createdAt,
    };
  }
}
