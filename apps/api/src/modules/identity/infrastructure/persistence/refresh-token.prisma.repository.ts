import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { RefreshTokenMapper } from './refresh-token.mapper';

@Injectable()
export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.transactionManager.client.refreshToken.findUnique({
      where: { tokenHash },
    });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const rows = await this.transactionManager.client.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(RefreshTokenMapper.toDomain);
  }

  async save(token: RefreshToken): Promise<void> {
    const data = RefreshTokenMapper.toPersistence(token);
    await this.transactionManager.client.refreshToken.upsert({
      where: { id: token.id },
      create: data,
      update: data,
    });
  }

  async revokeFamily(familyId: string, revokedAt: Date = new Date()): Promise<void> {
    await this.transactionManager.client.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async revokeAllForUser(userId: string, revokedAt: Date = new Date()): Promise<void> {
    await this.transactionManager.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async pruneExpired(before: Date = new Date()): Promise<number> {
    const result = await this.transactionManager.client.refreshToken.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return result.count;
  }
}
