import { Inject, Injectable } from '@nestjs/common';
import { AuditLog, AuditActorType } from '../../domain/entities/audit-log.entity';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository, AuditLogRow } from '../../domain/repositories/audit-log.repository';
import { AuditLogPort } from '../ports/audit-log.port';

// Writes join whatever transaction is already open via TransactionManager's
// AsyncLocalStorage — a mutating service calling audits.record(...) inside
// its own runInTransaction block gets "the audit row commits or rolls back
// with the action" for free, satisfying .docs/03 §5's "audit must be in the
// same transaction as the action" without every caller threading a client
// through.
@Injectable()
export class AuditService implements AuditLogPort {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: AuditLogRepository) {}

  async record(params: {
    actorType: AuditActorType;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const entry = AuditLog.record(params);
    await this.repository.append(entry);
  }

  async list(params: {
    entityType?: string;
    actorId?: string;
    action?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AuditLogRow[]; hasMore: boolean }> {
    return this.repository.list(params);
  }
}
