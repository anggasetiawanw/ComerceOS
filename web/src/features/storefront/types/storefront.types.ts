import { z } from 'zod';

export const storefrontSocialLinkSchema = z.object({
  id: z.string(),
  platform: z.string(),
  url: z.string(),
  position: z.number(),
});

export const storefrontProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  productType: z.enum(['digital', 'physical', 'service']),
  stock: z.number().nullable(),
  imageUrls: z.array(z.string()),
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
  hasWhatsapp: z.boolean(),
  socialLinks: z.array(storefrontSocialLinkSchema),
  products: z.array(storefrontProductSchema),
});

export const publicProductSchema = storefrontProductSchema;

export type Storefront = z.infer<typeof storefrontSchema>;
export type StorefrontSocialLink = z.infer<typeof storefrontSocialLinkSchema>;
export type StorefrontProduct = z.infer<typeof storefrontProductSchema>;
export type PublicProduct = z.infer<typeof publicProductSchema>;
