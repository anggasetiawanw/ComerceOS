import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../types/store.types';

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_.]*[a-z0-9])?$/;

export const usernameSchema = z
  .string()
  .min(3, 'Minimal 3 karakter')
  .max(30, 'Maksimal 30 karakter')
  .regex(USERNAME_PATTERN, 'Hanya huruf kecil, angka, titik, dan garis bawah');

export const createStoreSchema = z.object({
  username: usernameSchema,
});
export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const storeProfileSchema = z.object({
  displayName: z.string().min(1, 'Nama toko wajib diisi').max(100, 'Maksimal 100 karakter'),
  bio: z.string().max(500, 'Maksimal 500 karakter').optional().nullable(),
});
export type StoreProfileInput = z.infer<typeof storeProfileSchema>;

export const changeUsernameSchema = z.object({
  username: usernameSchema,
});
export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>;

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().min(1, 'URL wajib diisi').max(2048, 'URL terlalu panjang'),
});
export type SocialLinkInput = z.infer<typeof socialLinkSchema>;
