import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class TransactionManager {
  private readonly storage = new AsyncLocalStorage<TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => this.storage.run(tx, work));
  }

  get client(): TransactionClient | PrismaService {
    return this.storage.getStore() ?? this.prisma;
  }
}
