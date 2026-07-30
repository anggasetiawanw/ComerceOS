import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../../../shared/presentation/decorators/public.decorator';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { AuthService } from '../../application/services/auth.service';
import { AccountLinkingApplicationService } from '../../application/services/account-linking-application.service';
import { RegisterDto } from '../dto/requests/register.dto';
import { LoginDto } from '../dto/requests/login.dto';
import { VerifyEmailDto } from '../dto/requests/verify-email.dto';
import { ResendVerificationDto } from '../dto/requests/resend-verification.dto';
import { ForgotPasswordDto } from '../dto/requests/forgot-password.dto';
import { ResetPasswordDto } from '../dto/requests/reset-password.dto';
import { GoogleCallbackQueryDto } from '../dto/requests/google-callback-query.dto';
import { GoogleTokenDto } from '../dto/requests/google-token.dto';
import { LinkGoogleDto } from '../dto/requests/link-google.dto';
import { SetPasswordDto } from '../dto/requests/set-password.dto';
import { UserResponseDto } from '../dto/responses/user-response.dto';
import { AuthTokensResponseDto } from '../dto/responses/auth-tokens-response.dto';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import {
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from './cookie.util';
import { getClientIp, getUserAgent } from './request.util';

const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly accountLinking: AccountLinkingApplicationService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Get('google')
  async redirectToGoogle(
    @Query('redirect_uri') redirectUri: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const effectiveRedirectUri = redirectUri ?? this.config.googleRedirectUri;
    const url = await this.auth.createGoogleAuthorizationUrl(effectiveRedirectUri);
    res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query() query: GoogleCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.auth.handleGoogleCallback({
      code: query.code,
      state: query.state,
      userAgent: getUserAgent(req),
      ip: getClientIp(req),
    });

    if (result.isErr()) {
      res.redirect(`${this.config.frontendUrl}/masuk?error=${result.unwrapErr().code}`);
      return;
    }

    const authResult = result.unwrap();
    setRefreshTokenCookie(
      res,
      this.config,
      authResult.refreshTokenPlain,
      authResult.refreshTokenExpiresAt,
    );
    res.redirect(`${this.config.frontendUrl}/callback?accessToken=${authResult.accessToken}`);
  }

  @Public()
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogleToken(
    @Body() dto: GoogleTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.auth.loginWithGoogleIdToken({
      idToken: dto.idToken,
      userAgent: getUserAgent(req),
      ip: getClientIp(req),
    });
    const authResult = unwrapOrThrow(result);
    setRefreshTokenCookie(
      res,
      this.config,
      authResult.refreshTokenPlain,
      authResult.refreshTokenExpiresAt,
    );
    return {
      accessToken: authResult.accessToken,
      user: UserResponseDto.fromDomain(authResult.user),
    };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    const result = await this.auth.register(dto);
    const user = unwrapOrThrow(result);
    return UserResponseDto.fromDomain(user);
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto> {
    const result = await this.auth.login({
      email: dto.email,
      password: dto.password,
      userAgent: getUserAgent(req),
      ip: getClientIp(req),
    });
    const authResult = unwrapOrThrow(result);
    setRefreshTokenCookie(
      res,
      this.config,
      authResult.refreshTokenPlain,
      authResult.refreshTokenExpiresAt,
    );
    return {
      accessToken: authResult.accessToken,
      user: UserResponseDto.fromDomain(authResult.user),
    };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: true }> {
    const result = await this.auth.verifyEmail(dto.token);
    unwrapOrThrow(result);
    return { verified: true };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('verify-email/resend')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ sent: true }> {
    await this.auth.resendVerificationEmail(dto.email);
    return { sent: true };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ sent: true }> {
    await this.auth.requestPasswordReset(dto.email);
    return { sent: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ reset: true }> {
    const result = await this.auth.resetPassword(dto.token, dto.password);
    unwrapOrThrow(result);
    return { reset: true };
  }

  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: LinkGoogleDto,
  ): Promise<{ linked: true }> {
    const result = await this.accountLinking.linkGoogleAccount(user.id, dto.idToken);
    unwrapOrThrow(result);
    return { linked: true };
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetPasswordDto,
  ): Promise<{ set: true }> {
    const result = await this.accountLinking.setPassword(user.id, dto.password);
    unwrapOrThrow(result);
    return { set: true };
  }

  @Delete('google/unlink')
  @HttpCode(HttpStatus.OK)
  async unlinkGoogle(@CurrentUser() user: CurrentUserPayload): Promise<{ unlinked: true }> {
    const result = await this.accountLinking.unlinkGoogleAccount(user.id);
    unwrapOrThrow(result);
    return { unlinked: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto> {
    const cookieValue: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof cookieValue !== 'string') {
      throw new BadRequestException('Missing refresh token');
    }

    const result = await this.auth.refresh({
      refreshTokenPlain: cookieValue,
      userAgent: getUserAgent(req),
      ip: getClientIp(req),
    });

    if (result.isErr()) {
      clearRefreshTokenCookie(res, this.config);
      throw result.unwrapErr();
    }

    const authResult = result.unwrap();
    setRefreshTokenCookie(
      res,
      this.config,
      authResult.refreshTokenPlain,
      authResult.refreshTokenExpiresAt,
    );
    return {
      accessToken: authResult.accessToken,
      user: UserResponseDto.fromDomain(authResult.user),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ loggedOut: true }> {
    const cookieValue: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof cookieValue === 'string') {
      await this.auth.logout(cookieValue);
    }
    clearRefreshTokenCookie(res, this.config);
    return { loggedOut: true };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ loggedOut: true }> {
    await this.auth.logoutAll(user.id);
    clearRefreshTokenCookie(res, this.config);
    return { loggedOut: true };
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: CurrentUserPayload): Promise<
    Array<{
      id: string;
      familyId: string;
      userAgent: string | null;
      ip: string | null;
      createdAt: Date;
      expiresAt: Date;
    }>
  > {
    const sessions = await this.auth.listSessions(user.id);
    return sessions.map((session) => ({
      id: session.id,
      familyId: session.familyId,
      userAgent: session.userAgent,
      ip: session.ip,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
