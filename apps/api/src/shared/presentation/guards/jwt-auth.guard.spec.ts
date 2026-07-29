import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RequestWithUser } from './jwt-auth.guard';
import { AppJwtService, VerifiedAccessToken } from '../../security/jwt.service';

const buildContext = (request: Partial<RequestWithUser>): ExecutionContext => {
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  };
  return context as unknown as ExecutionContext;
};

const fakeJwtService = (
  behavior: (() => Promise<VerifiedAccessToken>) | undefined,
): AppJwtService => {
  const fake = { verifyAccessToken: behavior };
  return fake as unknown as AppJwtService;
};

describe('JwtAuthGuard', () => {
  it('allows a @Public() route without a token', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const guard = new JwtAuthGuard(reflector, fakeJwtService(undefined));

    await expect(guard.canActivate(buildContext({ headers: {} }))).resolves.toBe(true);
  });

  it('rejects a missing bearer token', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new JwtAuthGuard(reflector, fakeJwtService(undefined));

    await expect(guard.canActivate(buildContext({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a non-Bearer authorization header', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new JwtAuthGuard(reflector, fakeJwtService(undefined));

    await expect(
      guard.canActivate(buildContext({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the verified claims to the request and allows access', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const claims: VerifiedAccessToken = {
      sub: 'user-1',
      email: 'buyer@example.com',
      role: 'buyer',
      iat: 0,
      exp: 0,
    };
    const guard = new JwtAuthGuard(reflector, fakeJwtService(async () => claims));

    const request: Partial<RequestWithUser> = { headers: { authorization: 'Bearer token' } };
    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'buyer@example.com',
      role: 'buyer',
      storeId: undefined,
    });
  });

  it('rejects a token that fails verification', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new JwtAuthGuard(
      reflector,
      fakeJwtService(async () => {
        throw new Error('bad signature');
      }),
    );

    await expect(
      guard.canActivate(buildContext({ headers: { authorization: 'Bearer bad' } })),
    ).rejects.toThrow(UnauthorizedException);
  });
});
