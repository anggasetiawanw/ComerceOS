import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import { NotificationDeliveryRepository } from '../../domain/repositories/notification-delivery.repository';
import { NotificationDeliveryMapper } from './notification-delivery.mapper';

@Injectable()
export class NotificationDeliveryPrismaRepository implements NotificationDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NotificationDelivery | null> {
    const row = await this.prisma.notificationDelivery.findUnique({ where: { id } });
    return row ? NotificationDeliveryMapper.toDomain(row) : null;
  }

  async save(delivery: NotificationDelivery): Promise<void> {
    const data = NotificationDeliveryMapper.toPersistence(delivery);
    await this.prisma.notificationDelivery.upsert({
      where: { id: delivery.id },
      create: data,
      update: data,
    });
  }
}
