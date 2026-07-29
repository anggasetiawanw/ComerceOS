import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { User } from '../../domain/entities/user.aggregate';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.transactionManager.client.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.transactionManager.client.user.findUnique({ where: { googleId } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.transactionManager.client.user.findUnique({ where: { email } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await this.transactionManager.client.user.upsert({
      where: { id: user.id },
      create: data,
      update: data,
    });
  }
}
