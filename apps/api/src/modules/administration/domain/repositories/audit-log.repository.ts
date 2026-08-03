import { AuditLog } from '../entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogRow {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditLogRepository {
  append(entry: AuditLog): Promise<void>;
  list(params: {
    entityType?: string;
    actorId?: string;
    action?: string;
    limit: number;
    cursor?: { sortValue: string; id: string };
  }): Promise<{ rows: AuditLogRow[]; hasMore: boolean }>;
}
