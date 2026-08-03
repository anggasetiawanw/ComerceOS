-- Migration 007 — ledger
-- .docs/06-database-roadmap.md §1, §2.4, §3, §4 · .docs/09-payments-ledger.md §4, §7
-- .docs/04-entity-design.md §6 · .docs/brief/database-schema.md §balance_transactions, §withdrawals
--
-- Physical apply order note: this migration folder sorts after
-- 20260802000300_infrastructure even though the doc numbers it "007" —
-- same situation as migration 009 (digital_deliveries) landing before 011
-- in Sprint 5. Doc numbers are plan identifiers, not apply order.
--
-- bank_accounts and withdrawals ship as schema-only in this migration:
-- balance_transactions.withdrawal_id is a RESTRICT FK onto withdrawals, so
-- the target table must exist even though no repository, service, or
-- controller for either table exists until Sprint 7.
--
-- Rollback (manual, if ever needed):
--   ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_money_non_negative_check_stores"; -- n/a, see below
--   DROP INDEX IF EXISTS "orders_status_holding_until_idx";
--   ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_balance_non_negative_check";
--   DROP TABLE IF EXISTS "balance_transactions";
--   DROP TABLE IF EXISTS "withdrawals";
--   DROP TABLE IF EXISTS "bank_accounts";
--   DROP TYPE IF EXISTS "WithdrawalStatus";
--   DROP TYPE IF EXISTS "BalanceTransactionType";
-- Safe to drop only if nothing downstream references balance_transactions
-- (nothing does, as of this migration) and no withdrawal/bank_account rows
-- have been created by Sprint 7 code yet.

-- CreateEnum
CREATE TYPE "BalanceTransactionType" AS ENUM ('order_paid_holding', 'order_released', 'withdrawal_paid', 'refund_debit', 'promo_adjustment');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('requested', 'paid', 'rejected');

-- CreateTable
-- Append-only (.docs/09 §4): no application code ever UPDATEs or DELETEs a
-- row here. holding_delta/available_delta are a documented deviation from
-- the single signed "amount" column in brief/database-schema.md — the
-- order_released movement affects both holding and available in one row,
-- which one signed column cannot express (the doc's own worked example
-- writes it as "-95.000 / +95.000"). "amount" stays the unambiguous
-- display magnitude. Every row carries the resulting store balances so any
-- single row is independently verifiable without trusting prior rows.
CREATE TABLE "balance_transactions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT,
    "withdrawal_id" TEXT,
    "type" "BalanceTransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "holding_delta" BIGINT NOT NULL DEFAULT 0,
    "available_delta" BIGINT NOT NULL DEFAULT 0,
    "holding_balance_after" BIGINT NOT NULL,
    "available_balance_after" BIGINT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Schema-only this sprint — amendment 2.4 (.docs/06 §2.4): the account a
-- withdrawal pays out to. is_default enforced unique per store below.
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Schema-only this sprint. bank_account_snapshot freezes the destination at
-- request time so a later account edit never alters a past withdrawal.
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "amount" BIGINT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'requested',
    "bank_account_snapshot" JSONB NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "admin_note" TEXT,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Ledger history + reconciliation sums, per store (.docs/06 §3)
CREATE INDEX "balance_transactions_store_id_created_at_idx" ON "balance_transactions"("store_id", "created_at");

-- CreateIndex
-- An order's money trail (.docs/06 §3)
CREATE INDEX "balance_transactions_order_id_idx" ON "balance_transactions"("order_id");

-- CreateIndex
-- One entry per (order, movement type) — the DB half of the replay guard
-- that backs LedgerService's existsFor() idempotency check. A partial
-- unique index Prisma cannot express as @@index; hand-written and kept as
-- drift because it guards a money double-credit, not just an access path.
CREATE UNIQUE INDEX "balance_transactions_order_movement_uniq" ON "balance_transactions"("order_id", "type") WHERE "order_id" IS NOT NULL AND "type" IN ('order_paid_holding', 'order_released');

-- CreateIndex
-- One default bank account per store. Also a hand-written partial unique
-- index, same rationale as above.
CREATE UNIQUE INDEX "bank_accounts_one_default_per_store" ON "bank_accounts"("store_id") WHERE "is_default";

-- CreateIndex
-- Admin withdrawal queue (.docs/06 §3, Sprint 7)
CREATE INDEX "withdrawals_status_requested_at_idx" ON "withdrawals"("status", "requested_at");

-- CreateIndex
-- The release scheduler's only query (.docs/06 §3, .docs/10 §"release-holding-balance").
-- Specified in the docs as a partial index (WHERE status = 'holding');
-- shipped as a plain index per Sprint 5's precedent — Prisma cannot express
-- the partial predicate in @@index.
CREATE INDEX "orders_status_holding_until_idx" ON "orders"("status", "holding_until");

-- AddForeignKey
-- The ledger is immutable: a store or order carrying ledger history cannot
-- be deleted out from under it (.docs/06 §4, "anything financial restricts").
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- A deleted bank account does not invalidate the historical withdrawal
-- record — bank_account_snapshot already carries what's needed.
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Money is never negative — the ledger's last line of defence (.docs/06 §4)
ALTER TABLE "stores" ADD CONSTRAINT "stores_balance_non_negative_check" CHECK ("holding_balance" >= 0 AND "available_balance" >= 0);

-- The ledger's arithmetic must agree with its own snapshots
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_snapshots_non_negative_check" CHECK ("holding_balance_after" >= 0 AND "available_balance_after" >= 0);

ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_amount_positive_check" CHECK ("amount" > 0);
