import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { VerificationToken } from '../../domain/entities/verification-token.entity';
import { VerificationTokenPurpose } from '../../domain/entities/verification-token.entity';
import { VerificationTokenRepository } from '../../domain/repositories/verification-token.repository';
import { VerificationTokenMapper } from './verification-token.mapper';

@Injectable()
export class VerificationTokenPrismaRepository implements VerificationTokenRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findByHash(tokenHash: string): Promise<VerificationToken | null> {
    const row = await this.transactionManager.client.verificationToken.findUnique({
      where: { tokenHash },
    });
    return row ? VerificationTokenMapper.toDomain(row) : null;
  }

  async save(token: VerificationToken): Promise<void> {
    const data = VerificationTokenMapper.toPersistence(token);
    await this.transactionManager.client.verificationToken.upsert({
      where: { id: token.id },
      create: data,
      update: data,
    });
  }

  async invalidateOutstanding(userId: string, purpose: VerificationTokenPurpose): Promise<void> {
    await this.transactionManager.client.verificationToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
