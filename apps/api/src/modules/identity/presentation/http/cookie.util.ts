import { Response } from 'express';
import { AppConfigService } from '../../../../shared/config/app-config.service';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

// Root-path, non-sensitive companion to the refresh cookie: the refresh
// token itself is scoped to /api/v1/auth so it's never sent to unrelated
// routes, but the frontend's Next.js middleware needs a presence check on
// arbitrary paths like /dashboard/*. This carries no secret, only "a
// session may exist" — see .docs/07-auth.md §6.
export const SESSION_HINT_COOKIE = 'has_session';

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
    path: REFRESH_TOKEN_COOKIE_PATH,
    expires: expiresAt,
  });
  res.cookie(SESSION_HINT_COOKIE, '1', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
};

export const clearRefreshTokenCookie = (res: Response, config: AppConfigService): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
  res.clearCookie(SESSION_HINT_COOKIE, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
};
