export const STOREFRONT_READ_REPOSITORY = Symbol('STOREFRONT_READ_REPOSITORY');

export interface StorefrontSocialLinkRow {
  id: string;
  platform: string;
  url: string;
  position: number;
}

export interface StorefrontStoreRow {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  theme: unknown;
  plan: string;
  socialLinks: StorefrontSocialLinkRow[];
}

export interface StorefrontReadRepository {
  findByUsername(username: string): Promise<StorefrontStoreRow | null>;
}
