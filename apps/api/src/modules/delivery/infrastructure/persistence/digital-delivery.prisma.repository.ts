import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { DigitalDelivery } from '../../domain/entities/digital-delivery.aggregate';
import { DigitalDeliveryRepository } from '../../domain/repositories/digital-delivery.repository';
import { DigitalDeliveryMapper } from './digital-delivery.mapper';

@Injectable()
export class DigitalDeliveryPrismaRepository implements DigitalDeliveryRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: UniqueId): Promise<DigitalDelivery | null> {
    const row = await this.transactionManager.client.digitalDelivery.findUnique({ where: { id } });
    return row ? DigitalDeliveryMapper.toDomain(row) : null;
  }

  async findByIdForBuyer(id: UniqueId, buyerId: string): Promise<DigitalDelivery | null> {
    const row = await this.transactionManager.client.digitalDelivery.findFirst({
      where: { id, orderItem: { order: { buyerId } } },
    });
    return row ? DigitalDeliveryMapper.toDomain(row) : null;
  }

  async existsForOrderItem(orderItemId: string, filePath: string): Promise<boolean> {
    const count = await this.transactionManager.client.digitalDelivery.count({
      where: { orderItemId, filePath },
    });
    return count > 0;
  }

  async save(delivery: DigitalDelivery): Promise<void> {
    await this.transactionManager.client.digitalDelivery.upsert({
      where: { id: delivery.id },
      create: DigitalDeliveryMapper.toPersistenceCreate(delivery),
      update: DigitalDeliveryMapper.toPersistenceUpdate(delivery),
    });
  }
}
