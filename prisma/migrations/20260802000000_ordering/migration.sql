-- Migration 005 — ordering
-- .docs/06-database-roadmap.md §1, §2.13, §3, §4 (AD-04) · .docs/08-order-state-machine.md §2-3
-- .docs/04-entity-design.md §4 · .docs/brief/database-schema.md §orders, §order_items, §order_status_history
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "order_status_history";
--   DROP TABLE IF EXISTS "order_items";
--   DROP TABLE IF EXISTS "orders";
--   DROP TYPE IF EXISTS "StatusActorType";
--   DROP TYPE IF EXISTS "OrderStatus";
--   DROP TYPE IF EXISTS "OrderSource";
-- Safe to drop only if no downstream table has a foreign key onto "orders"/"order_items" yet
-- (webhook_events references orders SET NULL from migration 006; digital_deliveries
-- references order_items RESTRICT from migration 009 — drop those first).

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('self_checkout', 'manual');

-- CreateEnum
-- 'inquiry' is deliberately excluded — an inquiry has no money and no line
-- items, and lives in its own table from migration 013 (AD-08).
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'paid', 'holding', 'released', 'disputed', 'refunded', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "StatusActorType" AS ENUM ('system', 'seller', 'buyer', 'admin');

-- CreateTable
-- IDs are UUIDv7 generated in application code, never a database default.
-- Money columns are BIGINT rupiah integers (AD-04); platform_fee_rate stays
-- a numeric(5,4) rate snapshot, not money. No ledger columns here —
-- balance_transactions and stores.holding_balance are Sprint 6.
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "subtotal" BIGINT NOT NULL,
    "discount_code" TEXT,
    "discount_amount" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL,
    "platform_fee_rate" DECIMAL(5,4) NOT NULL,
    "platform_fee_amount" BIGINT NOT NULL,
    "payment_method" TEXT,
    "midtrans_transaction_id" TEXT,
    "shipping_address" JSONB,
    "paid_at" TIMESTAMP(3),
    "holding_until" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Snapshot of the product at purchase time — name/type/price/hpp never
-- change even if the source product is edited later. product_type_snapshot
-- is text, not the ProductType enum, so it survives a future enum change.
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "product_type_snapshot" TEXT NOT NULL,
    "price_snapshot" BIGINT NOT NULL,
    "hpp_snapshot" BIGINT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Every state transition writes exactly one row here (.docs/08 §6).
-- from_status/to_status are text, not the OrderStatus enum, so history
-- survives a future enum change.
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by_type" "StatusActorType" NOT NULL,
    "changed_by_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
-- Seller order list — the most-hit dashboard query (.docs/06 §3)
CREATE INDEX "orders_store_id_created_at_idx" ON "orders"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_store_id_status_created_at_idx" ON "orders"("store_id", "status", "created_at");

-- CreateIndex
-- Buyer /akun history
CREATE INDEX "orders_buyer_id_created_at_idx" ON "orders"("buyer_id", "created_at");

-- CreateIndex
-- Webhook → order lookup by Midtrans transaction id
CREATE INDEX "orders_midtrans_transaction_id_idx" ON "orders"("midtrans_transaction_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
-- Per-product performance report
CREATE INDEX "order_items_product_id_created_at_idx" ON "order_items"("product_id", "created_at");

-- CreateIndex
-- Dispute investigation
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- AddForeignKey
-- Anything financial restricts: an order-bearing store or user cannot be
-- deleted out from under its financial record (.docs/06 §4).
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- Items belong to the aggregate — cascades with the order.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- Products archive, never hard-delete, so this RESTRICT never actually fires.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- The audit trail must survive: a user who has changed an order's status
-- cannot be deleted out from under that history row.
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Money is never negative
ALTER TABLE "orders" ADD CONSTRAINT "orders_money_non_negative_check" CHECK ("subtotal" >= 0 AND "total" >= 0 AND "discount_amount" >= 0);

-- A discount can never exceed what it discounts
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_within_subtotal_check" CHECK ("discount_amount" <= "subtotal");

-- platform_fee_rate is a rate, not money — bounded to [0, 1]
ALTER TABLE "orders" ADD CONSTRAINT "orders_fee_rate_bounds_check" CHECK ("platform_fee_rate" >= 0 AND "platform_fee_rate" <= 1);

-- State machine timestamps must be coherent (.docs/06 §4)
ALTER TABLE "orders" ADD CONSTRAINT "orders_released_requires_paid_check" CHECK ("released_at" IS NULL OR "paid_at" IS NOT NULL);
ALTER TABLE "orders" ADD CONSTRAINT "orders_released_after_paid_check" CHECK ("released_at" IS NULL OR "released_at" >= "paid_at");
ALTER TABLE "orders" ADD CONSTRAINT "orders_holding_requires_paid_check" CHECK ("holding_until" IS NULL OR "paid_at" IS NOT NULL);

-- Status/timestamp agreement
ALTER TABLE "orders" ADD CONSTRAINT "orders_released_status_check" CHECK ("status" <> 'released' OR "released_at" IS NOT NULL);
ALTER TABLE "orders" ADD CONSTRAINT "orders_paid_status_check" CHECK ("status" NOT IN ('paid', 'holding', 'released') OR "paid_at" IS NOT NULL);

-- Line items are immutable positive quantities of non-negative snapshot money
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_qty_price_check" CHECK ("qty" > 0 AND "price_snapshot" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_hpp_non_negative_check" CHECK ("hpp_snapshot" IS NULL OR "hpp_snapshot" >= 0);
