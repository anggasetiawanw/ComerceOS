'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ImageUploader } from '@/components/forms/image-uploader';
import { storeKeys } from '../api/store.keys';
import type { Store } from '../types/store.types';

const BANNER_MAX_BYTES = 5 * 1024 * 1024;

export const BannerUploader = ({ store }: { store: Store }) => {
  const queryClient = useQueryClient();

  return (
    <ImageUploader
      label="Banner"
      endpoint="/stores/me/banner"
      maxBytes={BANNER_MAX_BYTES}
      currentUrl={store.bannerUrl}
      aspectClassName="aspect-[16/5] w-full rounded-lg"
      onUploaded={(updated) => queryClient.setQueryData(storeKeys.me(), updated)}
    />
  );
};
