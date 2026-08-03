import { UniqueId } from '../../../../shared/kernel/uuid';
import { WebhookEvent } from '../entities/webhook-event.entity';

export const WEBHOOK_EVENT_REPOSITORY = Symbol('WEBHOOK_EVENT_REPOSITORY');

export interface WebhookEventRepository {
  findById(id: UniqueId): Promise<WebhookEvent | null>;
  // Layer 1 idempotency: has a *different* row for this
  // (source, transactionId, transactionStatus) already been marked
  // processed? (.docs/09-payments-ledger.md §3) — deliberately not a unique
  // constraint, so this is a lookup, not an insert conflict.
  existsProcessed(source: string, transactionId: string | null, transactionStatus: string | null): Promise<boolean>;
  save(event: WebhookEvent): Promise<void>;
}
