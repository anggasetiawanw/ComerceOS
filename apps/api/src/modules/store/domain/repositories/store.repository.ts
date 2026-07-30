import { UniqueId } from '../../../../shared/kernel/uuid';
import { Store } from '../entities/store.aggregate';

export const STORE_REPOSITORY = Symbol('STORE_REPOSITORY');

export interface StoreRepository {
  findById(id: UniqueId): Promise<Store | null>;
  findByUsername(username: string): Promise<Store | null>;
  findByOwnerId(ownerId: UniqueId): Promise<Store | null>;
  existsByUsername(username: string): Promise<boolean>;
  save(store: Store): Promise<void>;
}
