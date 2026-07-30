import { z } from 'zod';

export const storefrontSocialLinkSchema = z.object({
  id: z.string(),
  platform: z.string(),
  url: z.string(),
  position: z.number(),
});

export const storefrontSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  theme: z.record(z.string(), z.string()).nullable(),
  plan: z.string(),
  socialLinks: z.array(storefrontSocialLinkSchema),
});

export type Storefront = z.infer<typeof storefrontSchema>;
export type StorefrontSocialLink = z.infer<typeof storefrontSocialLinkSchema>;
