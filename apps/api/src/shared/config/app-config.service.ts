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
}
