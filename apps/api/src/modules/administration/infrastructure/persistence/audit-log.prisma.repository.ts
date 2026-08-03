import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditLogRepository, AuditLogRow } from '../../domain/repositories/audit-log.repository';
import { AuditLogMapper } from './audit-log.mapper';

@Injectable()
export class AuditLogPrismaRepository implements AuditLogRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async append(entry: AuditLog): Promise<void> {
    await this.transactionManager.client.auditLog.create({ data: AuditLogMapper.toPersistence(entry) });
  }

  async list(params: {
    entityType?: string;
    actorId?: string;
    action?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AuditLogRow[]; hasMore: boolean }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.actorId ? { actorId: params.actorId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(params.cursor.sortValue) } },
              { createdAt: new Date(params.cursor.sortValue), id: { lt: params.cursor.id } },
            ],
          }
        : {}),
    };

    const rows = await this.transactionManager.client.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
    });

    const hasMore = rows.length > params.limit;
    const kept = hasMore ? rows.slice(0, params.limit) : rows;
    return { hasMore, rows: kept.map((row) => AuditLogMapper.toRow(row)) };
  }
}
