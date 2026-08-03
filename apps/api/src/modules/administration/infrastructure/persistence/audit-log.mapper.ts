import { Prisma, AuditLog as PrismaAuditLog } from '@prisma/client';
import { AuditLog, AuditActorType } from '../../domain/entities/audit-log.entity';
import { AuditLogRow } from '../../domain/repositories/audit-log.repository';

// metadata casts at the Json boundary match the precedent in
// notification-delivery.mapper.ts/invoice.mapper.ts: Prisma's JsonValue and
// InputJsonValue types are structurally compatible with
// Record<string, unknown> but not nominally identical.
const toMetadata = (value: Prisma.JsonValue | null): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toActorType = (value: string): AuditActorType => {
  if (value === 'user' || value === 'admin' || value === 'system') return value;
  throw new Error(`Corrupt audit_logs row: invalid actor_type "${value}"`);
};

export class AuditLogMapper {
  static toDomain(row: PrismaAuditLog): AuditLog {
    return AuditLog.reconstitute(
      {
        actorType: toActorType(row.actorType),
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: toMetadata(row.metadata),
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toRow(row: PrismaAuditLog): AuditLogRow {
    return {
      id: row.id,
      actorType: row.actorType,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: toMetadata(row.metadata),
      createdAt: row.createdAt,
    };
  }

  static toPersistence(entry: AuditLog): Prisma.AuditLogUncheckedCreateInput {
    return {
      id: entry.id,
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata === null ? Prisma.JsonNull : (entry.metadata as Prisma.InputJsonValue),
      createdAt: entry.createdAt,
    };
  }
}
