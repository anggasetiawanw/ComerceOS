-- Migration 017 — notifications (pulled forward from Sprint 12)
-- .docs/06-database-roadmap.md §2.14 (adjacent) · .docs/10-background-jobs.md §3
-- .docs/03-bounded-contexts.md §3.12
--
-- Pulled forward from its nominal Sprint 12 slot, the same move Sprint 5
-- made pulling migration 009 (digital_deliveries) forward from Sprint 6.
-- Sprint 6 ships the NotificationChannel port + EmailChannel adapter, and
-- dispatch is row-first: nothing is sent without a persisted delivery
-- record here. The retry job and admin viewer (the rest of migration 017's
-- original scope) stay Sprint 12 — this table is what they'll read.
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "notification_deliveries";
--   DROP TYPE IF EXISTS "NotificationDeliveryStatus";
--   DROP TYPE IF EXISTS "NotificationChannelType";
-- Safe to drop at any point after this migration — nothing references notification_deliveries.

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('email', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- CreateTable
-- No FK onto orders/stores/users — a delivery attempt outlives the entity
-- that triggered it (needed for retry/audit regardless of what happens
-- upstream), so recipient/payload are captured as plain columns instead.
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannelType" NOT NULL,
    "provider" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- The retry job's scan, specified as WHERE status = 'failed' in .docs/06 §3;
-- shipped as a plain index per Sprint 5's partial-index precedent.
CREATE INDEX "notification_deliveries_status_created_at_idx" ON "notification_deliveries"("status", "created_at");
