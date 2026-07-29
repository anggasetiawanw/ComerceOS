import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(row: PrismaRefreshToken): RefreshToken {
    return RefreshToken.reconstitute(
      {
        userId: row.userId,
        tokenHash: row.tokenHash,
        familyId: row.familyId,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        replacedById: row.replacedById,
        userAgent: row.userAgent,
        ip: row.ip,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistence(token: RefreshToken): PrismaRefreshToken {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      replacedById: token.replacedById,
      userAgent: token.userAgent,
      ip: token.ip,
      createdAt: token.createdAt,
    };
  }
}
