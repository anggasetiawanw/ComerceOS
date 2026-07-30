-- Migration 003 — store
-- .docs/06-database-roadmap.md §2.14, §3, §4 · .docs/04-entity-design.md §2
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "social_links";
--   DROP TABLE IF EXISTS "stores";
--   DROP TYPE IF EXISTS "SettlementMode";
--   DROP TYPE IF EXISTS "StorePlan";
-- Safe to drop only if no downstream table has a foreign key onto "stores" yet
-- (none does at this migration; products arrive in 004, orders in 005).

-- CreateEnum
CREATE TYPE "StorePlan" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "SettlementMode" AS ENUM ('auto', 'manual');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "username" CITEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "banner_url" TEXT,
    "theme" JSONB,
    "custom_domain" TEXT,
    "plan" "StorePlan" NOT NULL DEFAULT 'free',
    "settlement_mode" "SettlementMode" NOT NULL DEFAULT 'auto',
    "holding_balance" BIGINT NOT NULL DEFAULT 0,
    "available_balance" BIGINT NOT NULL DEFAULT 0,
    "invoice_counter" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_owner_id_key" ON "stores"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_username_key" ON "stores"("username");

-- CreateIndex
CREATE UNIQUE INDEX "stores_custom_domain_key" ON "stores"("custom_domain");

-- CreateIndex
CREATE INDEX "social_links_store_id_idx" ON "social_links"("store_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Balances are ledger-owned and can never go negative (.docs/06-database-roadmap.md §4, AD-06)
ALTER TABLE "stores" ADD CONSTRAINT "stores_balances_non_negative_check" CHECK ("holding_balance" >= 0 AND "available_balance" >= 0);

-- Gapless invoice numbering only ever moves forward (.docs/06-database-roadmap.md §2.14)
ALTER TABLE "stores" ADD CONSTRAINT "stores_invoice_counter_non_negative_check" CHECK ("invoice_counter" >= 0);

-- Social link ordering is a dense zero-based sequence maintained by the aggregate
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_position_non_negative_check" CHECK ("position" >= 0);
