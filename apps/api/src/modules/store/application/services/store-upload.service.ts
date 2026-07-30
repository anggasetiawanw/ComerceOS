import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { STORAGE_UPLOADER, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { Store } from '../../domain/entities/store.aggregate';
import { STORE_REPOSITORY, StoreRepository } from '../../domain/repositories/store.repository';
import { StoreNotFoundError } from '../../domain/errors/store.errors';

type UploadKind = 'avatar' | 'banner';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class StoreUploadService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async uploadAvatar(
    ownerId: string,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<Result<Store, StoreNotFoundError>> {
    return this.upload(ownerId, file, 'avatar');
  }

  async uploadBanner(
    ownerId: string,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<Result<Store, StoreNotFoundError>> {
    return this.upload(ownerId, file, 'banner');
  }

  private async upload(
    ownerId: string,
    file: { buffer: Buffer; mimetype: string },
    kind: UploadKind,
  ): Promise<Result<Store, StoreNotFoundError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const extension = EXTENSION_BY_MIME[file.mimetype] ?? 'bin';
    const objectPath = `stores/${store.id}/${kind}/${randomUUID()}.${extension}`;

    const uploaded = await this.storage.upload({
      bucket: 'public',
      path: objectPath,
      contentType: file.mimetype,
      body: file.buffer,
    });

    const nextProfile =
      kind === 'avatar' ? store.profile.withAvatarUrl(uploaded.url) : store.profile.withBannerUrl(uploaded.url);
    store.updateProfile(nextProfile);

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(store);
  }
}
