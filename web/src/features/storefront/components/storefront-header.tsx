import Image from 'next/image';
import { PlanBadge } from '@/features/store/components/plan-badge';
import { CopyableText } from '@/components/data/copyable-text';
import type { Storefront } from '../types/storefront.types';

export const StorefrontHeader = ({ store }: { store: Storefront }) => {
  const initials = store.displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col">
      <div className="relative aspect-16/6 w-full overflow-hidden rounded-b-lg bg-gradient-to-br from-primary/30 to-primary/10">
        {store.bannerUrl && (
          <Image src={store.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        )}
      </div>
      <div className="-mt-10 flex flex-col items-center gap-2 px-4">
        <div className="relative size-20 overflow-hidden rounded-full border-4 border-background bg-muted">
          {store.avatarUrl ? (
            <Image src={store.avatarUrl} alt={store.displayName} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {initials}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{store.displayName}</h1>
          <PlanBadge plan={store.plan} />
        </div>
        <CopyableText value={`@${store.username}`} />
        {store.bio && (
          <p className="max-w-md text-center text-sm whitespace-pre-line text-muted-foreground">
            {store.bio}
          </p>
        )}
      </div>
    </div>
  );
};
