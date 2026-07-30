import { Inject, Injectable } from '@nestjs/common';
import { STORE_REPOSITORY, StoreRepository } from '../../domain/repositories/store.repository';
import { StoreLookup } from '../../../identity/application/ports/store-lookup.port';

@Injectable()
export class StoreLookupService implements StoreLookup {
  constructor(@Inject(STORE_REPOSITORY) private readonly stores: StoreRepository) {}

  async findStoreIdByOwner(userId: string): Promise<string | null> {
    const store = await this.stores.findByOwnerId(userId);
    return store ? store.id : null;
  }
}
