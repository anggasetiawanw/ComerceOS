import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionManager } from '../prisma/transaction.manager';
import { generateId } from '../../kernel/uuid';
import { OutboxDomainEvent } from '../../kernel/outbox-domain-event.base';

export interface ClaimedOutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  attempts: number;
}

const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CAP_MS = 5 * 60 * 1_000;

@Injectable()
export class OutboxRepository {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly prisma: PrismaService,
  ) {}

  async enqueue(events: OutboxDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.transactionManager.client.outboxEvent.createMany({
      data: events.map((event) => ({
        id: generateId(),
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventName,
        // toPayload() is contractually JSON-safe (every concrete event
        // builds it from strings/numbers/booleans/ISO date strings) — this
        // is the one serialization boundary where that contract meets
        // Prisma's stricter InputJsonValue shape.
        payload: event.toPayload() as Prisma.InputJsonValue,
      })),
    });
  }

  async claimPending(limit: number): Promise<ClaimedOutboxEvent[]> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; event_type: string; aggregate_type: string; aggregate_id: string; payload: unknown; attempts: number }[]
      >`
        SELECT id, event_type, aggregate_type, aggregate_id, payload, attempts
        FROM outbox_events
        WHERE status = 'pending' AND available_at <= now()
        ORDER BY available_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids } },
        data: { status: 'processing' },
      });

      return rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        payload: row.payload as Record<string, unknown>,
        attempts: row.attempts,
      }));
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async markFailed(id: string, attempts: number, error: string): Promise<void> {
    const backoffMs = Math.min(BACKOFF_BASE_MS * 2 ** attempts, BACKOFF_CAP_MS);
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'pending',
        attempts: attempts + 1,
        availableAt: new Date(Date.now() + backoffMs),
        error,
      },
    });
  }
}
