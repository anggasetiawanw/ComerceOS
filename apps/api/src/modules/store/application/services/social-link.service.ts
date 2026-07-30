import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { SocialLink, SocialLinkError } from '../../domain/entities/social-link.entity';
import { SocialPlatform, SocialPlatformError } from '../../domain/value-objects/social-platform.vo';
import { STORE_REPOSITORY, StoreRepository } from '../../domain/repositories/store.repository';
import {
  InvalidSocialLinkOrderError,
  SocialLinkLimitExceededError,
  SocialLinkNotFoundError,
  StoreNotFoundError,
} from '../../domain/errors/store.errors';

type AddLinkError =
  | StoreNotFoundError
  | SocialPlatformError
  | SocialLinkError
  | SocialLinkLimitExceededError;
type UpdateLinkError = StoreNotFoundError | SocialPlatformError | SocialLinkError | SocialLinkNotFoundError;
type RemoveLinkError = StoreNotFoundError | SocialLinkNotFoundError;
type ReorderLinkError = StoreNotFoundError | InvalidSocialLinkOrderError;

@Injectable()
export class SocialLinkService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(ownerId: string): Promise<Result<readonly SocialLink[], StoreNotFoundError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());
    return Result.ok(store.socialLinks);
  }

  async add(
    ownerId: string,
    params: { platform: string; url: string },
  ): Promise<Result<SocialLink, AddLinkError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const platformResult = SocialPlatform.create(params.platform);
    if (platformResult.isErr()) return Result.err(platformResult.unwrapErr());

    const result = store.addSocialLink({ platform: platformResult.unwrap(), url: params.url });
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(result.unwrap());
  }

  async update(
    ownerId: string,
    linkId: string,
    params: { platform?: string; url?: string },
  ): Promise<Result<void, UpdateLinkError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    let platform: SocialPlatform | undefined;
    if (params.platform !== undefined) {
      const platformResult = SocialPlatform.create(params.platform);
      if (platformResult.isErr()) return Result.err(platformResult.unwrapErr());
      platform = platformResult.unwrap();
    }

    const result = store.updateSocialLink(linkId, { platform, url: params.url });
    if (result.isErr()) return result;

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(undefined);
  }

  async remove(ownerId: string, linkId: string): Promise<Result<void, RemoveLinkError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const result = store.removeSocialLink(linkId);
    if (result.isErr()) return result;

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(undefined);
  }

  async reorder(
    ownerId: string,
    orderedIds: string[],
  ): Promise<Result<readonly SocialLink[], ReorderLinkError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const result = store.reorderSocialLinks(orderedIds);
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(store.socialLinks);
  }
}
