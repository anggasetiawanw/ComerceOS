export const STOREFRONT_READ_REPOSITORY = Symbol('STOREFRONT_READ_REPOSITORY');

export interface StorefrontSocialLinkRow {
  id: string;
  platform: string;
  url: string;
  position: number;
}

export interface StorefrontProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  productType: string;
  stock: number | null;
  imageUrls: string[];
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
  products: StorefrontProductRow[];
}

export interface StorefrontReadRepository {
  findByUsername(username: string): Promise<StorefrontStoreRow | null>;
  findProductBySlug(username: string, slug: string): Promise<StorefrontProductRow | null>;
  findUsernameByStoreId(storeId: string): Promise<string | null>;
}
