import { serverFetch } from '@/lib/api/server-client';
import { publicProductSchema, storefrontSchema, type PublicProduct, type Storefront } from '../types/storefront.types';

const STOREFRONT_REVALIDATE_SECONDS = 60;

export const storefrontApi = {
  getByUsername: (username: string): Promise<Storefront> =>
    serverFetch(`/storefront/${encodeURIComponent(username)}`, storefrontSchema, {
      revalidate: STOREFRONT_REVALIDATE_SECONDS,
    }),
  getProduct: (username: string, slug: string): Promise<PublicProduct> =>
    serverFetch(
      `/storefront/${encodeURIComponent(username)}/products/${encodeURIComponent(slug)}`,
      publicProductSchema,
      { revalidate: STOREFRONT_REVALIDATE_SECONDS },
    ),
};
