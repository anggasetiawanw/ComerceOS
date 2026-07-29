import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RequestWithUser } from './jwt-auth.guard';

const buildContext = (request: Partial<RequestWithUser>): ExecutionContext => {
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  };
  return context as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  it('allows the request when no roles are required', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ headers: {} }))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const guard = new RolesGuard(reflector);

    const request = { headers: {}, user: { id: 'u1', email: 'a@x.com', role: 'admin' } };
    expect(guard.canActivate(buildContext(request))).toBe(true);
  });

  it('rejects a user whose role is not in the required list', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const guard = new RolesGuard(reflector);

    const request = { headers: {}, user: { id: 'u1', email: 'a@x.com', role: 'buyer' } };
    expect(() => guard.canActivate(buildContext(request))).toThrow(ForbiddenException);
  });

  it('rejects when there is no authenticated user at all', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext({ headers: {} }))).toThrow(ForbiddenException);
  });
});
