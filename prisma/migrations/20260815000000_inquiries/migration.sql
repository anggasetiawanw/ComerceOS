-- Migration 013 — inquiries
-- .docs/06-database-roadmap.md §1 · .docs/brief/database-schema.md §inquiries
-- Sprint 9, Path B (.docs/12-roadmap-sprints.md)
--
-- inquiries is the chat-first flow's trace: a storefront visitor clicks
-- "Tanya dulu via WA" and this row is recorded before anything else exists.
-- No buyer contact fields, per the brief — an inquiry has no money, no line
-- items, and often never becomes an order (.docs/06-database-roadmap.md
-- §2.1, AD-08). The seller matches an anonymous inquiry to their WA inbox
-- by product and timing; a logged-in visitor's inquiry does carry buyer_id.
--
-- Two FKs connect inquiries and orders, both nullable, matching the two
-- distinct columns the docs specify: orders.inquiry_id (which inquiry this
-- order was converted from — set once, at conversion) and
-- inquiries.converted_order_id (the reverse pointer, unique so an inquiry
-- can convert at most once at the database level, not just in the
-- application). orders.inquiry_id is added as a non-blocking
-- ALTER TABLE ADD COLUMN on the existing table.
--
-- stores.whatsapp_number is also new here — the seller's WA number that
-- powers both the deep link and the inquiry-received notification
-- recipient. Deferred from Sprint 2's Phone value object placeholder,
-- which named this exact migration as the trigger for building it for real.
--
-- Rollback (manual, if ever needed):
--   ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_inquiry_id_fkey";
--   ALTER TABLE "orders" DROP COLUMN IF EXISTS "inquiry_id";
--   ALTER TABLE "stores" DROP COLUMN IF EXISTS "whatsapp_number";
--   DROP TABLE IF EXISTS "inquiries";
--   DROP TYPE IF EXISTS "InquiryStatus";

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('open', 'converted', 'lost');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "inquiry_id" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "whatsapp_number" TEXT;

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT,
    "buyer_id" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'open',
    "converted_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_converted_order_id_key" ON "inquiries"("converted_order_id");

-- CreateIndex
CREATE INDEX "inquiries_store_id_status_created_at_idx" ON "inquiries"("store_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "orders_inquiry_id_idx" ON "orders"("inquiry_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
