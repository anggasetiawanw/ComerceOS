import { Module } from '@nestjs/common';
import { EmailModule } from '../../shared/infrastructure/email/email.module';
import { StoreModule } from '../store/store.module';
import { StoreLookupService } from '../store/application/services/store-lookup.service';
import { AuthService } from './application/services/auth.service';
import { AccountLinkingApplicationService } from './application/services/account-linking-application.service';
import { UserProfileService } from './application/services/user-profile.service';
import { BuyerDirectoryService } from './application/services/buyer-directory.service';
import { TokenRotationService } from './domain/services/token-rotation.service';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { VERIFICATION_TOKEN_REPOSITORY } from './domain/repositories/verification-token.repository';
import { GOOGLE_OAUTH_CLIENT } from './application/ports/google-oauth-client.port';
import { OAUTH_STATE_STORE } from './application/ports/oauth-state-store.port';
import { EMAIL_SENDER } from './application/ports/email-sender.port';
import { STORE_LOOKUP } from './application/ports/store-lookup.port';
import { UserPrismaRepository } from './infrastructure/persistence/user.prisma.repository';
import { RefreshTokenPrismaRepository } from './infrastructure/persistence/refresh-token.prisma.repository';
import { VerificationTokenPrismaRepository } from './infrastructure/persistence/verification-token.prisma.repository';
import { GoogleOAuthClientImpl } from './infrastructure/google/google-oauth.client';
import { RedisOAuthStateStore } from './infrastructure/redis/oauth-state.store';
import { ResendEmailSenderService } from './infrastructure/email/email-sender.service';
import { AuthController } from './presentation/http/auth.controller';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [StoreModule, EmailModule],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    AccountLinkingApplicationService,
    UserProfileService,
    BuyerDirectoryService,
    TokenRotationService,
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenPrismaRepository },
    { provide: VERIFICATION_TOKEN_REPOSITORY, useClass: VerificationTokenPrismaRepository },
    { provide: GOOGLE_OAUTH_CLIENT, useClass: GoogleOAuthClientImpl },
    { provide: OAUTH_STATE_STORE, useClass: RedisOAuthStateStore },
    { provide: EMAIL_SENDER, useClass: ResendEmailSenderService },
    { provide: STORE_LOOKUP, useExisting: StoreLookupService },
  ],
  exports: [USER_REPOSITORY, BuyerDirectoryService],
})
export class IdentityModule {}
