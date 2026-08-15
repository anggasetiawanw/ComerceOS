import { apiClient } from '@/lib/api/client';
import type { Store, StoreSettings, StoreSocialLink, UsernameAvailability } from '../types/store.types';

export const storeApi = {
  create: (input: { username: string; displayName?: string }) =>
    apiClient.post<Store>('/stores', input),
  getMine: () => apiClient.get<Store | null>('/stores/me'),
  checkUsername: (username: string) =>
    apiClient.get<UsernameAvailability>(
      `/stores/username-available?username=${encodeURIComponent(username)}`,
    ),
  updateProfile: (input: { displayName?: string; bio?: string | null; whatsappNumber?: string | null }) =>
    apiClient.patch<Store>('/stores/me', input),
  changeUsername: (username: string) =>
    apiClient.patch<Store>('/stores/me/username', { username }),
  getSettings: () => apiClient.get<StoreSettings>('/stores/me/settings'),
  changeSettlementMode: (mode: 'auto' | 'manual') =>
    apiClient.patch<StoreSettings>('/stores/me/settings/settlement', { mode }),
  listSocialLinks: () => apiClient.get<StoreSocialLink[]>('/stores/me/social-links'),
  addSocialLink: (input: { platform: string; url: string }) =>
    apiClient.post<StoreSocialLink>('/stores/me/social-links', input),
  updateSocialLink: (id: string, input: { platform?: string; url?: string }) =>
    apiClient.patch<{ updated: true }>(`/stores/me/social-links/${id}`, input),
  removeSocialLink: (id: string) =>
    apiClient.delete<{ removed: true }>(`/stores/me/social-links/${id}`),
  reorderSocialLinks: (orderedIds: string[]) =>
    apiClient.put<StoreSocialLink[]>('/stores/me/social-links/order', { orderedIds }),
};
