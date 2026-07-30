import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { DomainEventHandler } from '../../../../shared/infrastructure/events/domain-event.handler';
import { CacheService } from '../../../../shared/infrastructure/cache/cache.service';
import { STORE_EVENT_NAMES } from '../../../store/domain/events/store-event-names';
import { StoreProfileUpdatedEvent } from '../../../store/domain/events/store-profile-updated.event';
import { StoreSocialLinksChangedEvent } from '../../../store/domain/events/store-social-links-changed.event';
import { StorePlanChangedEvent } from '../../../store/domain/events/store-plan-changed.event';
import { StoreUsernameChangedEvent } from '../../../store/domain/events/store-username-changed.event';
import { storefrontCacheKey } from './storefront.service';

@Injectable()
export class StorefrontCacheInvalidator implements OnModuleInit {
  constructor(
    private readonly events: DomainEventPublisher,
    private readonly cache: CacheService,
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

    this.events.subscribe(STORE_EVENT_NAMES.PROFILE_UPDATED, invalidateOnUsername);
    this.events.subscribe(STORE_EVENT_NAMES.SOCIAL_LINKS_CHANGED, invalidateOnUsername);
    this.events.subscribe(STORE_EVENT_NAMES.PLAN_CHANGED, invalidateOnUsername);
    this.events.subscribe(STORE_EVENT_NAMES.USERNAME_CHANGED, invalidateOnUsernameChange);
  }
}
