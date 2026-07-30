import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { NotFoundError } from '@/lib/api/server-client';
import { StorefrontHeader } from '@/features/storefront/components/storefront-header';
import { StorefrontSocialLinks } from '@/features/storefront/components/storefront-social-links';
import { StorefrontEmpty } from '@/features/storefront/components/storefront-empty';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type StorefrontPageProps = {
  params: Promise<{ username: string }>;
};

export const generateMetadata = async ({ params }: StorefrontPageProps): Promise<Metadata> => {
  const { username } = await params;
  try {
    const store = await storefrontApi.getByUsername(username);
    return {
      title: `${store.displayName} (@${store.username}) · Nagihin`,
      description: store.bio ?? undefined,
      alternates: { canonical: `${SITE_URL}/@${store.username}` },
      openGraph: {
        title: store.displayName,
        description: store.bio ?? undefined,
        images: store.bannerUrl ? [store.bannerUrl] : undefined,
      },
    };
  } catch {
    return { title: 'Toko tidak ditemukan · Nagihin' };
  }
};

const StorefrontPage = async ({ params }: StorefrontPageProps) => {
  const { username } = await params;

  let store;
  try {
    store = await storefrontApi.getByUsername(username);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-1 flex-col">
      <StorefrontHeader store={store} />
      <StorefrontSocialLinks links={store.socialLinks} />
      <StorefrontEmpty />
    </div>
  );
};

export default StorefrontPage;
