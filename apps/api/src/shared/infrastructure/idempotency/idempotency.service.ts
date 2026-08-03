import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { IdempotencyKeyConflictError, IdempotencyKeyInFlightError } from './idempotency.errors';

export type IdempotencyOutcome =
  | { kind: 'proceed'; recordId: string }
  | { kind: 'replay'; status: number; body: unknown };

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  static hashBody(body: unknown): string {
    return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
  }

  async begin(key: string, userId: string, endpoint: string, requestHash: string): Promise<IdempotencyOutcome> {
    const recordId = randomUUID();
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          id: recordId,
          key,
          userId,
          endpoint,
          requestHash,
          expiresAt: new Date(Date.now() + this.config.idempotencyTtlHours * 60 * 60 * 1000),
        },
      });
      return { kind: 'proceed', recordId };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== PRISMA_UNIQUE_CONSTRAINT_CODE) {
        throw error;
      }

      const existing = await this.prisma.idempotencyKey.findUniqueOrThrow({
        where: { key_userId: { key, userId } },
      });

      if (existing.requestHash !== requestHash) {
        throw new IdempotencyKeyConflictError();
      }
      if (existing.responseStatus === null) {
        throw new IdempotencyKeyInFlightError();
      }
      return { kind: 'replay', status: existing.responseStatus, body: existing.responseBody };
    }
  }

  async complete(recordId: string, status: number, body: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id: recordId },
      data: { responseStatus: status, responseBody: body as Prisma.InputJsonValue },
    });
  }
}
