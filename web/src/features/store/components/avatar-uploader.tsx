'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ImageUploader } from '@/components/forms/image-uploader';
import { storeKeys } from '../api/store.keys';
import type { Store } from '../types/store.types';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AvatarUploader = ({ store }: { store: Store }) => {
  const queryClient = useQueryClient();

  return (
    <ImageUploader
      label="Avatar"
      endpoint="/stores/me/avatar"
      maxBytes={AVATAR_MAX_BYTES}
      currentUrl={store.avatarUrl}
      aspectClassName="size-24 rounded-full"
      onUploaded={(updated) => queryClient.setQueryData(storeKeys.me(), updated)}
    />
  );
};
