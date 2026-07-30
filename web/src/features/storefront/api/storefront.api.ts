import { serverFetch } from '@/lib/api/server-client';
import { storefrontSchema, type Storefront } from '../types/storefront.types';

const STOREFRONT_REVALIDATE_SECONDS = 60;

export const storefrontApi = {
  getByUsername: (username: string): Promise<Storefront> =>
    serverFetch(`/storefront/${encodeURIComponent(username)}`, storefrontSchema, {
      revalidate: STOREFRONT_REVALIDATE_SECONDS,
    }),
};
