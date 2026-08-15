import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppJwtService } from '../../security/jwt.service';
import { CurrentUserPayload } from '../../security/current-user.interface';

export interface RequestWithUser extends Request {
  user?: CurrentUserPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: AppJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (isPublic) {
      // Best-effort: a public route never requires a token, but a logged-in
      // visitor's token — when one happens to be present — still populates
      // request.user, so e.g. an inquiry can record a real buyerId without
      // trusting a client-supplied one. A missing or invalid token is not an
      // error here; it just leaves the route anonymous.
      if (token) {
        try {
          const claims = await this.jwt.verifyAccessToken(token);
          request.user = { id: claims.sub, email: claims.email, role: claims.role, storeId: claims.storeId };
        } catch {
          // swallow — anonymous access is still valid on a public route
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const claims = await this.jwt.verifyAccessToken(token);
      request.user = {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
        storeId: claims.storeId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(request: RequestWithUser): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
}
