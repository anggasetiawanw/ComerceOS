import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import { WebhookEventRepository } from '../../domain/repositories/webhook-event.repository';
import { WebhookEventMapper } from './webhook-event.mapper';

@Injectable()
export class WebhookEventPrismaRepository implements WebhookEventRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: UniqueId): Promise<WebhookEvent | null> {
    const row = await this.transactionManager.client.webhookEvent.findUnique({ where: { id } });
    return row ? WebhookEventMapper.toDomain(row) : null;
  }

  async existsProcessed(source: string, transactionId: string | null, transactionStatus: string | null): Promise<boolean> {
    if (!transactionId || !transactionStatus) return false;
    const count = await this.transactionManager.client.webhookEvent.count({
      where: { source, transactionId, transactionStatus, status: 'processed' },
    });
    return count > 0;
  }

  async save(event: WebhookEvent): Promise<void> {
    await this.transactionManager.client.webhookEvent.upsert({
      where: { id: event.id },
      create: WebhookEventMapper.toPersistenceCreate(event),
      update: WebhookEventMapper.toPersistenceUpdate(event),
    });
  }
}
