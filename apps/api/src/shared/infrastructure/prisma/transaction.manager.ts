import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class TransactionManager {
  private readonly storage = new AsyncLocalStorage<TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  // options is an escape hatch for callers holding a row lock across
  // something slower than Prisma's 5s default (e.g. the ledger under a
  // burst on one store) — most callers never need it.
  async runInTransaction<T>(
    work: () => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ): Promise<T> {
    return this.prisma.$transaction((tx) => this.storage.run(tx, work), options);
  }

  get client(): TransactionClient | PrismaService {
    return this.storage.getStore() ?? this.prisma;
  }
}
