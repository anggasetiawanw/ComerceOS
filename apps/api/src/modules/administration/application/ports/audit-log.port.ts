import { AuditActorType } from '../../domain/entities/audit-log.entity';

export const AUDIT_LOG_PORT = Symbol('AUDIT_LOG_PORT');

// The one sanctioned cross-context write path (.docs/03-bounded-contexts.md
// §3.13): every mutating context calls this instead of touching audit_logs
// directly, so the shape stays uniform. Owned here (application layer) and
// provided by AuditModule — a standalone module depending only on Prisma —
// so ledger/store/catalog can import AuditModule without importing the rest
// of AdministrationModule (which itself imports LedgerModule), avoiding a
// module cycle.
export interface AuditLogPort {
  record(params: {
    actorType: AuditActorType;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}
