import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export type AuditActorType = 'user' | 'admin' | 'system';

export interface AuditLogProps {
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// Persisted record, not an aggregate — same "row-first" precedent as
// WebhookEvent and NotificationDelivery. Nothing ever updates or deletes an
// audit row (.docs/03-bounded-contexts.md §3.13).
export class AuditLog extends Entity<AuditLogProps> {
  private constructor(props: AuditLogProps, id?: UniqueId) {
    super(props, id);
  }

  static record(params: {
    actorType: AuditActorType;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): AuditLog {
    return new AuditLog({
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: AuditLogProps, id: UniqueId): AuditLog {
    return new AuditLog(props, id);
  }

  get actorType(): AuditActorType {
    return this.props.actorType;
  }

  get actorId(): string | null {
    return this.props.actorId;
  }

  get action(): string {
    return this.props.action;
  }

  get entityType(): string {
    return this.props.entityType;
  }

  get entityId(): string {
    return this.props.entityId;
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
