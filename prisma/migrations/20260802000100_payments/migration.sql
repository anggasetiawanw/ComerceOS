-- Migration 006 — payments
-- .docs/06-database-roadmap.md §1, §3 · .docs/09-payments-ledger.md §2-3
-- .docs/04-entity-design.md §5 · .docs/brief/database-schema.md §webhook_events
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "webhook_events";
--   DROP TYPE IF EXISTS "WebhookEventStatus";
-- Safe to drop at any point after this migration — nothing references webhook_events.

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processed', 'failed', 'ignored');

-- CreateTable
-- The raw record of every Midtrans notification, persisted before any
-- interpretation — a malformed payload is still evidence (.docs/09 §2).
-- Deliberately no unique constraint on (source, transaction_id,
-- transaction_status): a duplicate delivery must be recorded and then
-- marked 'ignored', never rejected at the database and lost (.docs/09 §3).
-- transaction_id/transaction_status are extracted into real columns
-- (rather than an expression index on the jsonb payload) so the dedup
-- lookup is a plain indexed query.
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event_type" TEXT,
    "payload" JSONB NOT NULL,
    "order_id" TEXT,
    "transaction_id" TEXT,
    "transaction_status" TEXT,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
    "error_message" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Reconciliation lookup — non-unique by design, see the table comment above
CREATE INDEX "webhook_events_source_transaction_id_idx" ON "webhook_events"("source", "transaction_id");

-- CreateIndex
-- Retry scan for 'received'/'failed' events
CREATE INDEX "webhook_events_status_received_at_idx" ON "webhook_events"("status", "received_at");

-- AddForeignKey
-- SET NULL, not RESTRICT: the raw payload is evidence that must survive
-- independently of the order it (may) reference, and a late/malformed
-- webhook can arrive with no resolvable order at all.
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
