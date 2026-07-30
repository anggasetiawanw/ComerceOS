import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from '../../../../shared/infrastructure/cache/cache.service';
import { buildCacheKey } from '../../../../shared/infrastructure/cache/cache.keys';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { Username } from '../../../../shared/kernel/value-objects/username.vo';
import {
  STOREFRONT_READ_REPOSITORY,
  StorefrontReadRepository,
  StorefrontStoreRow,
} from '../ports/storefront-read.repository';

export interface StorefrontSocialLink {
  id: string;
  platform: string;
  url: string;
  position: number;
}

export interface StorefrontResult {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  theme: Record<string, string> | null;
  plan: string;
  socialLinks: StorefrontSocialLink[];
}

export const STOREFRONT_CACHE_NAMESPACE = 'storefront';
export const STOREFRONT_CACHE_VERSION = 'v1';

export const storefrontCacheKey = (username: string): string =>
  buildCacheKey(STOREFRONT_CACHE_NAMESPACE, STOREFRONT_CACHE_VERSION, username);

const isThemeRecord = (value: unknown): value is Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
};

const isStorefrontSocialLink = (value: unknown): value is StorefrontSocialLink => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('platform' in value) || !('url' in value) || !('position' in value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.platform === 'string' &&
    typeof value.url === 'string' &&
    typeof value.position === 'number'
  );
};

export const isStorefrontResult = (value: unknown): value is StorefrontResult => {
  if (typeof value !== 'object' || value === null) return false;
  if (
    !('id' in value) ||
    !('username' in value) ||
    !('displayName' in value) ||
    !('plan' in value) ||
    !('socialLinks' in value)
  ) {
    return false;
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.plan !== 'string'
  ) {
    return false;
  }
  return Array.isArray(value.socialLinks) && value.socialLinks.every(isStorefrontSocialLink);
};

const toStorefrontResult = (row: StorefrontStoreRow): StorefrontResult => ({
  id: row.id,
  username: row.username,
  displayName: row.displayName,
  bio: row.bio,
  avatarUrl: row.avatarUrl,
  bannerUrl: row.bannerUrl,
  theme: isThemeRecord(row.theme) ? row.theme : null,
  plan: row.plan,
  socialLinks: row.socialLinks.map((link) => ({
    id: link.id,
    platform: link.platform,
    url: link.url,
    position: link.position,
  })),
});

@Injectable()
export class StorefrontService {
  constructor(
    @Inject(STOREFRONT_READ_REPOSITORY) private readonly reads: StorefrontReadRepository,
    private readonly cache: CacheService,
    private readonly config: AppConfigService,
  ) {}

  async getByUsername(rawUsername: string): Promise<StorefrontResult | null> {
    const usernameResult = Username.create(rawUsername);
    if (usernameResult.isErr()) return null;
    const username = usernameResult.unwrap().value;

    return this.cache.getOrSet(
      storefrontCacheKey(username),
      this.config.storefrontCacheTtlSeconds,
      isStorefrontResult,
      async () => {
        const row = await this.reads.findByUsername(username);
        return row ? toStorefrontResult(row) : null;
      },
    );
  }
}
