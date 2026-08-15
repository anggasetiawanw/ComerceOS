export interface StoreSocialLink {
  id: string;
  platform: string;
  url: string;
  position: number;
}

export interface Store {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  theme: Record<string, string> | null;
  plan: string;
  settlementMode: string;
  whatsappNumber: string | null;
  createdAt: string;
}

export interface UsernameAvailability {
  available: boolean;
  reason?: 'reserved' | 'taken';
}

export interface StoreSettings {
  settlementMode: string;
  plan: string;
  holdingDaysDigital: number;
  holdingDaysPhysical: number;
  holdingDaysService: number;
  midtransSettlementDays: number;
  autoForceReleaseDays: number;
}

export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'whatsapp', 'youtube', 'other'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
