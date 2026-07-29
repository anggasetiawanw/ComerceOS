import { RefreshToken } from '../entities/refresh-token.entity';
import { UniqueId } from '../../../../shared/kernel/uuid';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  findActiveByUserId(userId: UniqueId): Promise<RefreshToken[]>;
  save(token: RefreshToken): Promise<void>;
  revokeFamily(familyId: UniqueId, revokedAt?: Date): Promise<void>;
  revokeAllForUser(userId: UniqueId, revokedAt?: Date): Promise<void>;
  pruneExpired(before?: Date): Promise<number>;
}
