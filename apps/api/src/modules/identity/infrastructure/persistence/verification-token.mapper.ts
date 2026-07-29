import { VerificationToken as PrismaVerificationToken } from '@prisma/client';
import { VerificationToken } from '../../domain/entities/verification-token.entity';

export class VerificationTokenMapper {
  static toDomain(row: PrismaVerificationToken): VerificationToken {
    return VerificationToken.reconstitute(
      {
        userId: row.userId,
        tokenHash: row.tokenHash,
        purpose: row.purpose,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistence(token: VerificationToken): PrismaVerificationToken {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      purpose: token.purpose,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }
}
