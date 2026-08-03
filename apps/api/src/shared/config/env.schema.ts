import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_DATABASE_URL: z.string().min(1, 'DIRECT_DATABASE_URL is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_BUCKET_PUBLIC: z.string().optional().default(''),
  SUPABASE_BUCKET_PRIVATE: z.string().optional().default(''),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  SWAGGER_USER: z.string().optional().default(''),
  SWAGGER_PASSWORD: z.string().optional().default(''),

  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  JWT_KID: z.string().default('default'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional().default(''),

  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM_ADDRESS: z.string().default('no-reply@nagihin.id'),

  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  GENERAL_THROTTLE_LIMIT: z.coerce.number().int().positive().default(300),
  GENERAL_THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  STOREFRONT_THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  STOREFRONT_THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  HOLDING_DAYS_DIGITAL: z.coerce.number().int().min(0).default(0),
  HOLDING_DAYS_PHYSICAL: z.coerce.number().int().min(0).default(3),
  HOLDING_DAYS_SERVICE: z.coerce.number().int().min(0).default(7),
  MIDTRANS_SETTLEMENT_DAYS: z.coerce.number().int().min(0).default(3),
  AUTO_FORCE_RELEASE_DAYS: z.coerce.number().int().positive().default(30),

  PLAN_FEE_RATE_FREE: z.coerce.number().min(0).max(1).default(0.05),
  PLAN_FEE_RATE_PRO: z.coerce.number().min(0).max(1).default(0.025),

  STOREFRONT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  UPLOAD_MAX_AVATAR_BYTES: z.coerce.number().int().positive().default(2_097_152),
  UPLOAD_MAX_BANNER_BYTES: z.coerce.number().int().positive().default(5_242_880),
  UPLOAD_MAX_PRODUCT_IMAGE_BYTES: z.coerce.number().int().positive().default(5_242_880),
  UPLOAD_MAX_DIGITAL_FILE_BYTES: z.coerce.number().int().positive().default(52_428_800),
  DIGITAL_FILE_MAX_DOWNLOADS: z.coerce.number().int().positive().default(3),

  USERNAME_CHANGE_COOLDOWN_DAYS: z.coerce.number().int().min(0).default(30),
  USERNAME_RESERVATION_DAYS: z.coerce.number().int().min(0).default(90),

  MIDTRANS_SERVER_KEY: z.string().optional().default(''),
  MIDTRANS_CLIENT_KEY: z.string().optional().default(''),
  MIDTRANS_IS_PRODUCTION: z.coerce.boolean().default(false),
  MIDTRANS_NGROK_DEV: z.string().optional().default(''),

  ORDER_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),

  CHECKOUT_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),
  CHECKOUT_THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().positive().default(24),
  DELIVERY_URL_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),

  OUTBOX_RELAY_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  OUTBOX_RELAY_BATCH_SIZE: z.coerce.number().int().positive().default(50),

  // Sprint 6 — Money. Blank PUPPETEER_EXECUTABLE_PATH selects NullPdfRenderer
  // (same "blank config = null adapter" pattern as StorageModule/Midtrans),
  // which is what keeps invoicing.int-spec.ts and local dev free of a
  // Chromium dependency. docker/Dockerfile.worker sets a real path.
  PUPPETEER_EXECUTABLE_PATH: z.string().optional().default(''),

  // Sprint 7 — Payouts & admin. WITHDRAWAL_MIN_AMOUNT matches .docs/09
  // §7's "below this, transfer fees dominate" (Rp50.000). ADMIN_ALERT_EMAIL
  // blank skips the withdrawal-requested admin notification — same
  // blank-config-selects-null-adapter pattern as the rest of the app. The
  // admin route throttle (600/min, .docs/05 §17) is a literal @Throttle()
  // constant in the controllers, matching every other route-specific
  // throttle in the app (checkout/auth/storefront) — not env-configurable,
  // since @Throttle() decorators evaluate before DI can inject config.
  WITHDRAWAL_MIN_AMOUNT: z.coerce.number().int().positive().default(50_000),
  ADMIN_ALERT_EMAIL: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): Env => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data satisfies Env;
};
