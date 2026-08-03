-- Migration 011 — infrastructure
-- .docs/06-database-roadmap.md §1, §2.11, §2.12 (AD-05, AD-07) · .docs/09-payments-ledger.md §6
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "outbox_events";
--   DROP TABLE IF EXISTS "idempotency_keys";
--   DROP TYPE IF EXISTS "OutboxStatus";
-- Safe to drop at any point after this migration — neither table is referenced.

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'published', 'failed');

-- CreateTable
-- The transactional outbox (AD-05). A relay in the worker polls
-- (status, available_at), publishes to BullMQ, and marks published. This is
-- what makes "order marked paid but the downstream job was lost" impossible
-- when Redis is briefly unavailable — the row committed with the state
-- change that caused it and is retried until it publishes.
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Backs the HTTP Idempotency-Key layer for POST /checkout (and, from
-- Sprint 7, POST /withdrawals). A replay of (key, user_id) with the same
-- request hash returns the stored response; a different hash is a 409
-- Conflict (.docs/09 §3, AD-07).
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- The relay's only query — the hottest small query in the system (.docs/06 §2.11)
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_user_id_key" ON "idempotency_keys"("key", "user_id");
