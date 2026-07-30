import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { DomainEventHandler } from '../../../../shared/infrastructure/events/domain-event.handler';
import { CacheService } from '../../../../shared/infrastructure/cache/cache.service';
import { DomainEvent } from '../../../../shared/kernel/domain-event.base';
import { STORE_EVENT_NAMES } from '../../../store/domain/events/store-event-names';
import { StoreProfileUpdatedEvent } from '../../../store/domain/events/store-profile-updated.event';
import { StoreSocialLinksChangedEvent } from '../../../store/domain/events/store-social-links-changed.event';
import { StorePlanChangedEvent } from '../../../store/domain/events/store-plan-changed.event';
import { StoreUsernameChangedEvent } from '../../../store/domain/events/store-username-changed.event';
import { CATALOG_EVENT_NAMES } from '../../../catalog/domain/events/catalog-event-names';
import { ProductUpdatedEvent } from '../../../catalog/domain/events/product-updated.event';
import { ProductArchivedEvent } from '../../../catalog/domain/events/product-archived.event';
import { ProductStockDepletedEvent } from '../../../catalog/domain/events/product-stock-depleted.event';
import { STOREFRONT_READ_REPOSITORY, StorefrontReadRepository } from '../ports/storefront-read.repository';
import { storefrontCacheKey, storefrontProductCacheKey } from './storefront.service';

interface CatalogProductEvent extends DomainEvent {
  storeId: string;
  slug: string;
  previousSlug?: string | null;
}

const isCatalogProductEvent = (event: DomainEvent): event is CatalogProductEvent =>
  event instanceof ProductUpdatedEvent ||
  event instanceof ProductArchivedEvent ||
  event instanceof ProductStockDepletedEvent;

@Injectable()
export class StorefrontCacheInvalidator implements OnModuleInit {
  constructor(
    private readonly events: DomainEventPublisher,
    private readonly cache: CacheService,
    @Inject(STOREFRONT_READ_REPOSITORY) private readonly reads: StorefrontReadRepository,
  ) {}

  onModuleInit(): void {
    const invalidateOnUsername: DomainEventHandler = {
      handle: async (event) => {
        if (
          event instanceof StoreProfileUpdatedEvent ||
          event instanceof StoreSocialLinksChangedEvent ||
          event instanceof StorePlanChangedEvent
        ) {
          await this.cache.del(storefrontCacheKey(event.username));
        }
      },
    };

    const invalidateOnUsernameChange: DomainEventHandler = {
      handle: async (event) => {
        if (event instanceof StoreUsernameChangedEvent) {
          await this.cache.del(
            storefrontCacheKey(event.previousUsername),
            storefrontCacheKey(event.newUsername),
          );
        }
      },
    };

    const invalidateOnCatalogEvent: DomainEventHandler = {
      handle: async (event) => {
        if (!isCatalogProductEvent(event)) return;

        const username = await this.reads.findUsernameByStoreId(event.storeId);
        if (!username) return;

        const keys = [storefrontCacheKey(username), storefrontProductCacheKey(username, event.slug)];
        if (event.previousSlug) {
          keys.push(storefrontProductCacheKey(username, event.previousSlug));
        }
        await this.cache.del(...keys);
      },
    };

    this.events.subscribe(STORE_EVENT_NAMES.PROFILE_UPDATED, invalidateOnUsername);
    this.events.subscribe(STORE_EVENT_NAMES.SOCIAL_LINKS_CHANGED, invalidateOnUsername);
    this.events.subscribe(STORE_EVENT_NAMES.PLAN_CHANGED, invalidateOnUsername);
    this.events.subscribe(STORE_EVENT_NAMES.USERNAME_CHANGED, invalidateOnUsernameChange);

    this.events.subscribe(CATALOG_EVENT_NAMES.PRODUCT_UPDATED, invalidateOnCatalogEvent);
    this.events.subscribe(CATALOG_EVENT_NAMES.PRODUCT_ARCHIVED, invalidateOnCatalogEvent);
    this.events.subscribe(CATALOG_EVENT_NAMES.PRODUCT_STOCK_DEPLETED, invalidateOnCatalogEvent);
  }
}
