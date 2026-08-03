import { Inject, Injectable } from '@nestjs/common';
import { STORE_BUYER_REPOSITORY, StoreBuyerRepository } from '../../domain/repositories/store-buyer.repository';
import {
  STORE_BUYER_READ_REPOSITORY,
  StoreBuyerReadRepository,
  StoreBuyerRow,
  StoreBuyerSort,
} from '../../domain/repositories/store-buyer-read.repository';

@Injectable()
export class StoreBuyerService {
  constructor(
    @Inject(STORE_BUYER_REPOSITORY) private readonly buyers: StoreBuyerRepository,
    @Inject(STORE_BUYER_READ_REPOSITORY) private readonly reads: StoreBuyerReadRepository,
  ) {}

  async upsertFromPaidOrder(storeId: string, buyerId: string): Promise<void> {
    await this.buyers.upsertOnPurchase(storeId, buyerId);
  }

  async list(params: {
    storeId: string;
    search?: string;
    sort: StoreBuyerSort;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: StoreBuyerRow[]; hasMore: boolean }> {
    return this.reads.listByStore(params);
  }
}
