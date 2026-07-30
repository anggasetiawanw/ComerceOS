import { z } from 'zod';
import { PRODUCT_TYPES } from '../types/product.types';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MONEY_PATTERN = /^\d+$/;

export const productFormSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(200, 'Maksimal 200 karakter'),
  slug: z
    .string()
    .regex(SLUG_PATTERN, 'Hanya huruf kecil, angka, dan tanda hubung')
    .max(120, 'Maksimal 120 karakter')
    .optional()
    .or(z.literal('')),
  description: z.string().max(5000, 'Maksimal 5000 karakter').optional().or(z.literal('')),
  price: z.string().regex(MONEY_PATTERN, 'Harga harus berupa angka'),
  hpp: z.string().regex(MONEY_PATTERN, 'HPP harus berupa angka').optional().or(z.literal('')),
  productType: z.enum(PRODUCT_TYPES),
  stock: z.string().regex(/^\d*$/, 'Stok harus berupa angka').optional().or(z.literal('')),
});
export type ProductFormInput = z.infer<typeof productFormSchema>;
