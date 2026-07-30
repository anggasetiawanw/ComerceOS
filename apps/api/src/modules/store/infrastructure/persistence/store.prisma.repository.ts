import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Store } from '../../domain/entities/store.aggregate';
import { StoreRepository } from '../../domain/repositories/store.repository';
import { PrismaStoreWithLinks, StoreMapper } from './store.mapper';
import { SocialLinkMapper } from './social-link.mapper';

const SOCIAL_LINKS_INCLUDE = { socialLinks: { orderBy: { position: 'asc' as const } } };

@Injectable()
export class StorePrismaRepository implements StoreRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: UniqueId): Promise<Store | null> {
    const row: PrismaStoreWithLinks | null = await this.transactionManager.client.store.findUnique({
      where: { id },
      include: SOCIAL_LINKS_INCLUDE,
    });
    return row ? StoreMapper.toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<Store | null> {
    const row: PrismaStoreWithLinks | null = await this.transactionManager.client.store.findUnique({
      where: { username },
      include: SOCIAL_LINKS_INCLUDE,
    });
    return row ? StoreMapper.toDomain(row) : null;
  }

  async findByOwnerId(ownerId: UniqueId): Promise<Store | null> {
    const row: PrismaStoreWithLinks | null = await this.transactionManager.client.store.findUnique({
      where: { ownerId },
      include: SOCIAL_LINKS_INCLUDE,
    });
    return row ? StoreMapper.toDomain(row) : null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.transactionManager.client.store.count({ where: { username } });
    return count > 0;
  }

  async save(store: Store): Promise<void> {
    const data = {
      create: StoreMapper.toPersistenceCreate(store),
      update: StoreMapper.toPersistenceUpdate(store),
    };
    await this.transactionManager.client.store.upsert({
      where: { id: store.id },
      create: data.create,
      update: data.update,
    });

    for (const link of store.socialLinks) {
      await this.transactionManager.client.socialLink.upsert({
        where: { id: link.id },
        create: SocialLinkMapper.toPersistenceCreate(link),
        update: SocialLinkMapper.toPersistenceUpdate(link),
      });
    }

    const currentIds = store.socialLinks.map((link) => link.id);
    await this.transactionManager.client.socialLink.deleteMany({
      where: { storeId: store.id, id: { notIn: currentIds } },
    });
  }
}
