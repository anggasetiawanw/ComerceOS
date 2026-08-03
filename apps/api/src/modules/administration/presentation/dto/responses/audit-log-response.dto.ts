import { AuditLogRow } from '../../../domain/repositories/audit-log.repository';

export class AuditLogResponseDto {
  id!: string;
  actorType!: string;
  actorId!: string | null;
  action!: string;
  entityType!: string;
  entityId!: string;
  metadata!: Record<string, unknown> | null;
  createdAt!: string;

  static fromRow(row: AuditLogRow): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = row.id;
    dto.actorType = row.actorType;
    dto.actorId = row.actorId;
    dto.action = row.action;
    dto.entityType = row.entityType;
    dto.entityId = row.entityId;
    dto.metadata = row.metadata;
    dto.createdAt = row.createdAt.toISOString();
    return dto;
  }
}
