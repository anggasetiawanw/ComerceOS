import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from '../../../../shared/infrastructure/cache/cache.service';
import { buildCacheKey } from '../../../../shared/infrastructure/cache/cache.keys';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { Username } from '../../../../shared/kernel/value-objects/username.vo';
import { Slug } from '../../../../shared/kernel/value-objects/slug.vo';
import {
  STOREFRONT_READ_REPOSITORY,
  StorefrontProductRow,
  StorefrontReadRepository,
  StorefrontStoreRow,
} from '../ports/storefront-read.repository';

export interface StorefrontSocialLink {
  id: string;
  platform: string;
  url: string;
  position: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  productType: string;
  stock: number | null;
  imageUrls: string[];
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
  products: StorefrontProduct[];
}

export const STOREFRONT_CACHE_NAMESPACE = 'storefront';
export const STOREFRONT_CACHE_VERSION = 'v2';
export const STOREFRONT_PRODUCT_CACHE_NAMESPACE = 'storefront-product';

export const storefrontCacheKey = (username: string): string =>
  buildCacheKey(STOREFRONT_CACHE_NAMESPACE, STOREFRONT_CACHE_VERSION, username);

export const storefrontProductCacheKey = (username: string, slug: string): string =>
  buildCacheKey(STOREFRONT_PRODUCT_CACHE_NAMESPACE, STOREFRONT_CACHE_VERSION, username, slug);

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

export const isStorefrontProduct = (value: unknown): value is StorefrontProduct => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('name' in value) || !('slug' in value) || !('price' in value)) return false;
  if (!('productType' in value) || !('stock' in value) || !('imageUrls' in value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.price === 'string' &&
    typeof value.productType === 'string' &&
    (value.stock === null || typeof value.stock === 'number') &&
    Array.isArray(value.imageUrls) &&
    value.imageUrls.every((url) => typeof url === 'string')
  );
};

export const isStorefrontResult = (value: unknown): value is StorefrontResult => {
  if (typeof value !== 'object' || value === null) return false;
  if (
    !('id' in value) ||
    !('username' in value) ||
    !('displayName' in value) ||
    !('plan' in value) ||
    !('socialLinks' in value) ||
    !('products' in value)
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
  return (
    Array.isArray(value.socialLinks) &&
    value.socialLinks.every(isStorefrontSocialLink) &&
    Array.isArray(value.products) &&
    value.products.every(isStorefrontProduct)
  );
};

const toStorefrontProduct = (row: StorefrontProductRow): StorefrontProduct => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  price: row.price,
  productType: row.productType,
  stock: row.stock,
  imageUrls: row.imageUrls,
});

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
  products: row.products.map(toStorefrontProduct),
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

  async getProduct(rawUsername: string, rawSlug: string): Promise<StorefrontProduct | null> {
    const usernameResult = Username.create(rawUsername);
    if (usernameResult.isErr()) return null;
    const username = usernameResult.unwrap().value;

    const slugResult = Slug.create(rawSlug);
    if (slugResult.isErr()) return null;
    const slug = slugResult.unwrap().value;

    return this.cache.getOrSet(
      storefrontProductCacheKey(username, slug),
      this.config.storefrontCacheTtlSeconds,
      isStorefrontProduct,
      async () => {
        const row = await this.reads.findProductBySlug(username, slug);
        return row ? toStorefrontProduct(row) : null;
      },
    );
  }
}
