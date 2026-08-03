import { z } from 'zod';

export const bankAccountSchema = z.object({
  bankCode: z.string().min(1, 'Pilih bank'),
  accountNumber: z
    .string()
    .min(4, 'Minimal 4 digit')
    .max(20, 'Maksimal 20 digit')
    .regex(/^[0-9]+$/, 'Hanya angka'),
  accountHolderName: z.string().min(2, 'Minimal 2 karakter').max(100, 'Maksimal 100 karakter'),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

// Rp50.000 mirrors the API's WITHDRAWAL_MIN_AMOUNT default
// (.env.example) — the API is the real authority; this is just a fast
// client-side check before the round trip.
export const withdrawalRequestSchema = z.object({
  amount: z.string().min(1, 'Jumlah wajib diisi'),
});
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;

export const WITHDRAWAL_MIN_AMOUNT_HINT = 50_000;
