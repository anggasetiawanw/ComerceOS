-- Migration 009 — delivery
-- Pulled forward from Sprint 6 to Sprint 5 so a paid digital order is
-- actually downloadable, matching the sprint's stated deliverable
-- (.docs/12-roadmap-sprints.md Sprint 5). .docs/06-database-roadmap.md §1, §2.7
-- .docs/04-entity-design.md §8 · .docs/brief/database-schema.md §digital_deliveries
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "digital_deliveries";
-- Safe to drop at any point after this migration — nothing references digital_deliveries.

-- CreateTable
-- One row per (order_item, digital_file) so a multi-file product provisions
-- independently per file — @@unique below is what makes provisioning
-- idempotent on redelivery. The signed URL itself is never persisted; it is
-- generated on demand. expires_at bounds the signed URL window, not the
-- buyer's entitlement: a buyer returning after expiry gets a freshly signed
-- URL as long as download_count < max_downloads (.docs/06 §2.7).
CREATE TABLE "digital_deliveries" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "max_downloads" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "digital_deliveries_order_item_id_file_path_key" ON "digital_deliveries"("order_item_id", "file_path");

-- AddForeignKey
-- Order items are immutable after creation and never deleted independently
-- of their order, so this RESTRICT never actually fires in practice.
ALTER TABLE "digital_deliveries" ADD CONSTRAINT "digital_deliveries_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The entitlement counter can never exceed its own ceiling and never negative
ALTER TABLE "digital_deliveries" ADD CONSTRAINT "digital_deliveries_download_count_bounds_check" CHECK ("download_count" >= 0 AND "download_count" <= "max_downloads");
