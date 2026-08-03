import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get directDatabaseUrl(): string {
    return this.config.get('DIRECT_DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get jwtPrivateKey(): string {
    return this.config.get('JWT_PRIVATE_KEY', { infer: true }).replace(/\\n/g, '\n');
  }

  get jwtPublicKey(): string {
    return this.config.get('JWT_PUBLIC_KEY', { infer: true }).replace(/\\n/g, '\n');
  }

  get jwtKid(): string {
    return this.config.get('JWT_KID', { infer: true });
  }

  get jwtAccessTtlSeconds(): number {
    return this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  get jwtRefreshTtlDays(): number {
    return this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
  }

  get googleClientId(): string {
    return this.config.get('GOOGLE_CLIENT_ID', { infer: true });
  }

  get googleClientSecret(): string {
    return this.config.get('GOOGLE_CLIENT_SECRET', { infer: true });
  }

  get googleRedirectUri(): string {
    return this.config.get('GOOGLE_REDIRECT_URI', { infer: true });
  }

  get resendApiKey(): string {
    return this.config.get('RESEND_API_KEY', { infer: true });
  }

  get emailFromAddress(): string {
    return this.config.get('EMAIL_FROM_ADDRESS', { infer: true });
  }

  get authThrottleLimit(): number {
    return this.config.get('AUTH_THROTTLE_LIMIT', { infer: true });
  }

  get authThrottleTtlSeconds(): number {
    return this.config.get('AUTH_THROTTLE_TTL_SECONDS', { infer: true });
  }

  get generalThrottleLimit(): number {
    return this.config.get('GENERAL_THROTTLE_LIMIT', { infer: true });
  }

  get generalThrottleTtlSeconds(): number {
    return this.config.get('GENERAL_THROTTLE_TTL_SECONDS', { infer: true });
  }

  get storefrontThrottleLimit(): number {
    return this.config.get('STOREFRONT_THROTTLE_LIMIT', { infer: true });
  }

  get storefrontThrottleTtlSeconds(): number {
    return this.config.get('STOREFRONT_THROTTLE_TTL_SECONDS', { infer: true });
  }

  get holdingDaysDigital(): number {
    return this.config.get('HOLDING_DAYS_DIGITAL', { infer: true });
  }

  get holdingDaysPhysical(): number {
    return this.config.get('HOLDING_DAYS_PHYSICAL', { infer: true });
  }

  get holdingDaysService(): number {
    return this.config.get('HOLDING_DAYS_SERVICE', { infer: true });
  }

  get midtransSettlementDays(): number {
    return this.config.get('MIDTRANS_SETTLEMENT_DAYS', { infer: true });
  }

  get autoForceReleaseDays(): number {
    return this.config.get('AUTO_FORCE_RELEASE_DAYS', { infer: true });
  }

  get planFeeRateFree(): number {
    return this.config.get('PLAN_FEE_RATE_FREE', { infer: true });
  }

  get planFeeRatePro(): number {
    return this.config.get('PLAN_FEE_RATE_PRO', { infer: true });
  }

  get storefrontCacheTtlSeconds(): number {
    return this.config.get('STOREFRONT_CACHE_TTL_SECONDS', { infer: true });
  }

  get uploadMaxAvatarBytes(): number {
    return this.config.get('UPLOAD_MAX_AVATAR_BYTES', { infer: true });
  }

  get uploadMaxBannerBytes(): number {
    return this.config.get('UPLOAD_MAX_BANNER_BYTES', { infer: true });
  }

  get uploadMaxProductImageBytes(): number {
    return this.config.get('UPLOAD_MAX_PRODUCT_IMAGE_BYTES', { infer: true });
  }

  get uploadMaxDigitalFileBytes(): number {
    return this.config.get('UPLOAD_MAX_DIGITAL_FILE_BYTES', { infer: true });
  }

  get digitalFileMaxDownloads(): number {
    return this.config.get('DIGITAL_FILE_MAX_DOWNLOADS', { infer: true });
  }

  get usernameChangeCooldownDays(): number {
    return this.config.get('USERNAME_CHANGE_COOLDOWN_DAYS', { infer: true });
  }

  get usernameReservationDays(): number {
    return this.config.get('USERNAME_RESERVATION_DAYS', { infer: true });
  }

  get supabaseUrl(): string {
    return this.config.get('SUPABASE_URL', { infer: true });
  }

  get supabaseServiceRoleKey(): string {
    return this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
  }

  get supabaseBucketPublic(): string {
    return this.config.get('SUPABASE_BUCKET_PUBLIC', { infer: true });
  }

  get supabaseBucketPrivate(): string {
    return this.config.get('SUPABASE_BUCKET_PRIVATE', { infer: true });
  }

  get isStorageConfigured(): boolean {
    return (
      this.supabaseUrl.length > 0 &&
      this.supabaseServiceRoleKey.length > 0 &&
      this.supabaseBucketPublic.length > 0 &&
      this.supabaseBucketPrivate.length > 0
    );
  }

  get midtransServerKey(): string {
    return this.config.get('MIDTRANS_SERVER_KEY', { infer: true });
  }

  get midtransClientKey(): string {
    return this.config.get('MIDTRANS_CLIENT_KEY', { infer: true });
  }

  get midtransIsProduction(): boolean {
    return this.config.get('MIDTRANS_IS_PRODUCTION', { infer: true });
  }

  get midtransNgrokDev(): string {
    return this.config.get('MIDTRANS_NGROK_DEV', { infer: true });
  }

  get isMidtransConfigured(): boolean {
    return this.midtransServerKey.length > 0 && this.midtransClientKey.length > 0;
  }

  get orderExpiryHours(): number {
    return this.config.get('ORDER_EXPIRY_HOURS', { infer: true });
  }

  get checkoutThrottleLimit(): number {
    return this.config.get('CHECKOUT_THROTTLE_LIMIT', { infer: true });
  }

  get checkoutThrottleTtlSeconds(): number {
    return this.config.get('CHECKOUT_THROTTLE_TTL_SECONDS', { infer: true });
  }

  get idempotencyTtlHours(): number {
    return this.config.get('IDEMPOTENCY_TTL_HOURS', { infer: true });
  }

  get deliveryUrlTtlSeconds(): number {
    return this.config.get('DELIVERY_URL_TTL_SECONDS', { infer: true });
  }

  get outboxRelayIntervalMs(): number {
    return this.config.get('OUTBOX_RELAY_INTERVAL_MS', { infer: true });
  }

  get outboxRelayBatchSize(): number {
    return this.config.get('OUTBOX_RELAY_BATCH_SIZE', { infer: true });
  }

  get puppeteerExecutablePath(): string {
    return this.config.get('PUPPETEER_EXECUTABLE_PATH', { infer: true });
  }

  get isPdfRendererConfigured(): boolean {
    return this.puppeteerExecutablePath.length > 0;
  }
}
