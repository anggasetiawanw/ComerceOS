import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { AppJwtModule } from '../../shared/security/jwt.module';
import { IdentityModule } from './identity.module';
import { AuthService } from './application/services/auth.service';
import {
  GOOGLE_OAUTH_CLIENT,
  GoogleOAuthClient,
  GoogleProfile,
} from './application/ports/google-oauth-client.port';
import { EMAIL_SENDER, EmailSender } from './application/ports/email-sender.port';

class FakeGoogleOAuthClient implements GoogleOAuthClient {
  nextProfile: GoogleProfile | null = null;

  async createAuthorizationRequest() {
    return { state: 'state', codeVerifier: 'verifier', url: 'https://accounts.google.com/mock' };
  }

  async exchangeCode(): Promise<GoogleProfile> {
    if (!this.nextProfile) throw new Error('no profile queued');
    return this.nextProfile;
  }

  async verifyIdToken(): Promise<GoogleProfile> {
    if (!this.nextProfile) throw new Error('no profile queued');
    return this.nextProfile;
  }
}

class FakeEmailSender implements EmailSender {
  lastVerificationToken: string | null = null;
  lastResetToken: string | null = null;

  async sendVerificationEmail(params: { token: string }): Promise<void> {
    this.lastVerificationToken = params.token;
  }

  async sendPasswordResetEmail(params: { token: string }): Promise<void> {
    this.lastResetToken = params.token;
  }
}

describe('Identity (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let auth: AuthService;
  let googleClient: FakeGoogleOAuthClient;
  let emailSender: FakeEmailSender;

  beforeAll(async () => {
    googleClient = new FakeGoogleOAuthClient();
    emailSender = new FakeEmailSender();

    moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        PrismaModule,
        RedisModule,
        EventsModule,
        StorageModule,
        AppJwtModule,
        IdentityModule,
      ],
    })
      .overrideProvider(GOOGLE_OAUTH_CLIENT)
      .useValue(googleClient)
      .overrideProvider(EMAIL_SENDER)
      .useValue(emailSender)
      .compile();

    prisma = moduleRef.get(PrismaService);
    auth = moduleRef.get(AuthService);
  });

  beforeEach(async () => {
    await prisma.notificationDelivery.deleteMany();
    await prisma.balanceTransaction.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.storeBuyer.deleteMany();
    await prisma.digitalDelivery.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.digitalFile.deleteMany();
    await prisma.product.deleteMany();
    await prisma.socialLink.deleteMany();
    await prisma.store.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.quit();
    await moduleRef.close();
  });

  describe('register -> verify -> login', () => {
    it('cannot log in before verifying, then can after', async () => {
      const registerResult = await auth.register({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
        name: 'Buyer',
      });
      expect(registerResult.isOk()).toBe(true);

      const tooEarly = await auth.login({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
      });
      expect(tooEarly.isErr()).toBe(true);

      expect(emailSender.lastVerificationToken).not.toBeNull();
      const verifyResult = await auth.verifyEmail(emailSender.lastVerificationToken as string);
      expect(verifyResult.isOk()).toBe(true);

      const loginResult = await auth.login({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
      });
      expect(loginResult.isOk()).toBe(true);
      expect(loginResult.unwrap().accessToken).toEqual(expect.any(String));
    });

    it('rejects the wrong password', async () => {
      await auth.register({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
        name: 'Buyer',
      });
      await auth.verifyEmail(emailSender.lastVerificationToken as string);

      const result = await auth.login({ email: 'buyer@example.com', password: 'wrong' });
      expect(result.isErr()).toBe(true);
    });
  });

  describe('forgot / reset password', () => {
    it('reset password revokes every existing session', async () => {
      await auth.register({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
        name: 'Buyer',
      });
      await auth.verifyEmail(emailSender.lastVerificationToken as string);
      const login = (
        await auth.login({ email: 'buyer@example.com', password: 'correct-horse-battery' })
      ).unwrap();

      await auth.requestPasswordReset('buyer@example.com');
      expect(emailSender.lastResetToken).not.toBeNull();

      const resetResult = await auth.resetPassword(
        emailSender.lastResetToken as string,
        'a-brand-new-password',
      );
      expect(resetResult.isOk()).toBe(true);

      const refreshAfterReset = await auth.refresh({
        refreshTokenPlain: login.refreshTokenPlain,
      });
      expect(refreshAfterReset.isErr()).toBe(true);

      const loginWithOldPassword = await auth.login({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
      });
      expect(loginWithOldPassword.isErr()).toBe(true);

      const loginWithNewPassword = await auth.login({
        email: 'buyer@example.com',
        password: 'a-brand-new-password',
      });
      expect(loginWithNewPassword.isOk()).toBe(true);
    });
  });

  describe('refresh rotation and reuse detection', () => {
    it('rotates the token on refresh and detects reuse of the old one', async () => {
      await auth.register({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
        name: 'Buyer',
      });
      await auth.verifyEmail(emailSender.lastVerificationToken as string);
      const login = (
        await auth.login({ email: 'buyer@example.com', password: 'correct-horse-battery' })
      ).unwrap();

      const firstRefresh = (
        await auth.refresh({ refreshTokenPlain: login.refreshTokenPlain })
      ).unwrap();
      expect(firstRefresh.refreshTokenPlain).not.toBe(login.refreshTokenPlain);

      // Presenting the original (now-rotated-away) token again is reuse.
      const reuseAttempt = await auth.refresh({ refreshTokenPlain: login.refreshTokenPlain });
      expect(reuseAttempt.isErr()).toBe(true);

      // The whole family — including the legitimately-rotated token — is now dead.
      const legitimateTokenAfterReuse = await auth.refresh({
        refreshTokenPlain: firstRefresh.refreshTokenPlain,
      });
      expect(legitimateTokenAfterReuse.isErr()).toBe(true);
    });
  });

  describe('Google login collision (.docs/07-auth.md §1b)', () => {
    it('refuses to log in via Google when the email already belongs to an unlinked password account', async () => {
      await auth.register({
        email: 'buyer@example.com',
        password: 'correct-horse-battery',
        name: 'Buyer',
      });
      await auth.verifyEmail(emailSender.lastVerificationToken as string);

      googleClient.nextProfile = {
        googleId: 'google-1',
        email: 'buyer@example.com',
        emailVerified: true,
        name: 'Buyer',
        avatarUrl: null,
      };

      const result = await auth.loginWithGoogleIdToken({ idToken: 'whatever' });
      expect(result.isErr()).toBe(true);

      const user = await prisma.user.findUnique({ where: { email: 'buyer@example.com' } });
      expect(user?.googleId).toBeNull();
    });

    it('creates a new verified user when the Google email has no existing account', async () => {
      googleClient.nextProfile = {
        googleId: 'google-2',
        email: 'newbuyer@example.com',
        emailVerified: true,
        name: 'New Buyer',
        avatarUrl: null,
      };

      const result = await auth.loginWithGoogleIdToken({ idToken: 'whatever' });
      expect(result.isOk()).toBe(true);

      const user = await prisma.user.findUnique({ where: { email: 'newbuyer@example.com' } });
      expect(user?.googleId).toBe('google-2');
      expect(user?.emailVerifiedAt).not.toBeNull();
    });
  });
});
