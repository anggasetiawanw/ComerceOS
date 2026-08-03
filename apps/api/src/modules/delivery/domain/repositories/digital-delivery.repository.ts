import { UniqueId } from '../../../../shared/kernel/uuid';
import { DigitalDelivery } from '../entities/digital-delivery.aggregate';

export const DIGITAL_DELIVERY_REPOSITORY = Symbol('DIGITAL_DELIVERY_REPOSITORY');

export interface DigitalDeliveryRepository {
  findById(id: UniqueId): Promise<DigitalDelivery | null>;
  findByIdForBuyer(id: UniqueId, buyerId: string): Promise<DigitalDelivery | null>;
  // Idempotency key for provision-digital-delivery: one row per (order item, file).
  existsForOrderItem(orderItemId: string, filePath: string): Promise<boolean>;
  save(delivery: DigitalDelivery): Promise<void>;
}
