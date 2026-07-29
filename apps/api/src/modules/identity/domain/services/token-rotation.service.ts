import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { RefreshToken } from '../entities/refresh-token.entity';
import { InvalidOrExpiredTokenError } from '../errors/identity.errors';

export type RotationOutcome =
  | { kind: 'rotated'; revoked: RefreshToken; issued: RefreshToken }
  | { kind: 'reuse_detected'; familyId: UniqueId; userId: UniqueId };

export class TokenRotationService {
  rotate(params: {
    presented: RefreshToken;
    newTokenHash: string;
    ttlMs: number;
    userAgent?: string | null;
    ip?: string | null;
    now?: Date;
  }): Result<RotationOutcome, InvalidOrExpiredTokenError> {
    const now = params.now ?? new Date();
    const { presented } = params;

    if (presented.isRevoked()) {
      return Result.ok({
        kind: 'reuse_detected',
        familyId: presented.familyId,
        userId: presented.userId,
      });
    }

    if (presented.isExpired(now)) {
      return Result.err(new InvalidOrExpiredTokenError());
    }

    const issued = RefreshToken.issue({
      userId: presented.userId,
      tokenHash: params.newTokenHash,
      familyId: presented.familyId,
      expiresAt: new Date(now.getTime() + params.ttlMs),
      userAgent: params.userAgent,
      ip: params.ip,
    });

    presented.revoke(issued.id);

    return Result.ok({ kind: 'rotated', revoked: presented, issued });
  }
}
