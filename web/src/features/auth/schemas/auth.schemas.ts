import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Maksimal 100 karakter'),
  phone: z.string().max(20, 'Maksimal 20 karakter').optional().or(z.literal('')),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
