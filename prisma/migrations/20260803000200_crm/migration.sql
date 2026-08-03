-- Migration 010 — crm
-- .docs/06-database-roadmap.md §1, §3 · .docs/04-entity-design.md §9
-- .docs/brief/database-schema.md §store_buyers · .docs/03-bounded-contexts.md §3.9
--
-- store_buyers is the buyer database — CRM's owned table and, per
-- .docs/03 §3.9, "the product's actual moat". Recomputed from orders on
-- every OrderPaid replay, never incremented — see the upsertOnPurchase SQL
-- in modules/crm. tags/notes are seller-entered and are never touched by
-- that recompute, which is what makes replaying it safe.
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "store_buyers";
-- Safe to drop at any point after this migration — nothing references store_buyers.

-- CreateTable
CREATE TABLE "store_buyers" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "first_purchase_at" TIMESTAMP(3) NOT NULL,
    "last_purchase_at" TIMESTAMP(3) NOT NULL,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_spent" BIGINT NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,

    CONSTRAINT "store_buyers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_buyers_store_id_buyer_id_key" ON "store_buyers"("store_id", "buyer_id");

-- CreateIndex
-- CRM default sort (.docs/06 §3)
CREATE INDEX "store_buyers_store_id_last_purchase_at_idx" ON "store_buyers"("store_id", "last_purchase_at");

-- CreateIndex
-- CRM sort by value (.docs/06 §3)
CREATE INDEX "store_buyers_store_id_total_spent_idx" ON "store_buyers"("store_id", "total_spent");

-- AddForeignKey
ALTER TABLE "store_buyers" ADD CONSTRAINT "store_buyers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- The CRM record must survive as long as the buyer's user account exists (.docs/06 §4)
ALTER TABLE "store_buyers" ADD CONSTRAINT "store_buyers_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_buyers" ADD CONSTRAINT "store_buyers_totals_non_negative_check" CHECK ("total_orders" >= 0 AND "total_spent" >= 0);
