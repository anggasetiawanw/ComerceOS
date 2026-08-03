-- Migration 008 — invoicing
-- .docs/06-database-roadmap.md §1, §2.14 · .docs/04-entity-design.md §7
-- .docs/brief/database-schema.md §invoices
--
-- Deviations from the documented schema, recorded here rather than silently:
--   - invoice_number is unique per store (store_id, invoice_number), not
--     globally unique as brief/database-schema.md states — a global unique
--     is unsatisfiable alongside .docs/04 §7's "per-store sequential", since
--     two stores' first invoice would both be number 1 and collide. store_id
--     is added to the table for this and so GET /invoices doesn't join
--     orders on every list page.
--   - rendered_at and snapshot are new columns beyond the documented 7.
--     rendered_at lets GET /invoices/:id/pdf return a precise "not ready
--     yet" (422) instead of an ambiguous 404 during the async PDF render
--     window. snapshot (jsonb) freezes Invoice.fromOrder's full view model
--     so a later product rename or store profile edit never alters an
--     issued invoice.
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "invoices";
--   DROP TYPE IF EXISTS "InvoiceSentVia";
-- Safe to drop at any point after this migration — nothing references invoices.

-- CreateEnum
CREATE TYPE "InvoiceSentVia" AS ENUM ('wa', 'email', 'both');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "pdf_url" TEXT,
    "rendered_at" TIMESTAMP(3),
    "sent_via" "InvoiceSentVia",
    "sent_at" TIMESTAMP(3),
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Idempotency on order_id: generate-invoice looks this up before
-- allocating a number (.docs/09 §6, .docs/10 §"generate-invoice").
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_store_id_invoice_number_key" ON "invoices"("store_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoices_store_id_created_at_idx" ON "invoices"("store_id", "created_at");

-- AddForeignKey
-- Financial record: RESTRICT (.docs/06 §4)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
