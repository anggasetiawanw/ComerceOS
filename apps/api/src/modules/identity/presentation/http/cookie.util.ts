import { Response } from 'express';
import { AppConfigService } from '../../../../shared/config/app-config.service';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

export const setRefreshTokenCookie = (
  res: Response,
  config: AppConfigService,
  token: string,
  expiresAt: Date,
): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
    expires: expiresAt,
  });
};

export const clearRefreshTokenCookie = (res: Response, config: AppConfigService): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
};
