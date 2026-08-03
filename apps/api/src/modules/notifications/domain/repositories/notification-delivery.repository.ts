import { NotificationDelivery } from '../entities/notification-delivery.entity';

export const NOTIFICATION_DELIVERY_REPOSITORY = Symbol('NOTIFICATION_DELIVERY_REPOSITORY');

export interface NotificationDeliveryRepository {
  findById(id: string): Promise<NotificationDelivery | null>;
  save(delivery: NotificationDelivery): Promise<void>;
}
