'use client';

import { ErrorState } from '@/components/data/error-state';
import { useMyStore } from '@/features/store/hooks/use-my-store';
import { CreateStoreCard } from '@/features/store/components/create-store-card';
import { StoreProfileForm } from '@/features/store/components/store-profile-form';
import { StoreLinkCard } from '@/features/store/components/store-link-card';
import { SocialLinksEditor } from '@/features/store/components/social-links-editor';
import { AvatarUploader } from '@/features/store/components/avatar-uploader';
import { BannerUploader } from '@/features/store/components/banner-uploader';
import { UsernameChangeDialog } from '@/features/store/components/username-change-dialog';
import { StoreSkeleton } from '@/features/store/components/store-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StoreEditorPage = () => {
  const { data: store, isPending, isError, refetch } = useMyStore();

  if (isPending) {
    return <StoreSkeleton />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!store) {
    return <CreateStoreCard />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Toko saya</h1>
        <p className="text-sm text-muted-foreground">Kelola profil publik dan tautan toko kamu.</p>
      </div>

      <StoreLinkCard username={store.username} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Profil toko</CardTitle>
          <UsernameChangeDialog currentUsername={store.username} />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <AvatarUploader store={store} />
            <div className="flex-1">
              <BannerUploader store={store} />
            </div>
          </div>
          <StoreProfileForm store={store} />
        </CardContent>
      </Card>

      <SocialLinksEditor />
    </div>
  );
};

export default StoreEditorPage;
