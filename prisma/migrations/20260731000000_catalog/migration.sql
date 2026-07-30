-- Migration 004 — catalog
-- .docs/06-database-roadmap.md §2, §3, §4 (AD-04) · .docs/04-entity-design.md §3
-- .docs/brief/database-schema.md §products, §digital_files
--
-- Rollback (manual, if ever needed):
--   DROP TABLE IF EXISTS "digital_files";
--   DROP TABLE IF EXISTS "products";
--   DROP TYPE IF EXISTS "ProductStatus";
--   DROP TYPE IF EXISTS "ProductType";
-- Safe to drop only if no downstream table has a foreign key onto "products" yet
-- (none does at this migration; order_items arrives RESTRICT-referencing products in 005).

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('digital', 'physical', 'service');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'draft', 'archived');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" BIGINT NOT NULL,
    "hpp" BIGINT,
    "product_type" "ProductType" NOT NULL,
    "stock" INTEGER,
    "images" JSONB NOT NULL DEFAULT '[]',
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_files" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "max_downloads" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_store_id_slug_key" ON "products"("store_id", "slug");

-- CreateIndex
CREATE INDEX "products_store_id_status_idx" ON "products"("store_id", "status");

-- CreateIndex
CREATE INDEX "digital_files_product_id_idx" ON "digital_files"("product_id");

-- AddForeignKey
-- Products are referenced by order_items (RESTRICT, Sprint 5) and are archived,
-- never hard-deleted (.docs/03-bounded-contexts.md §3.3), so a store cannot be
-- deleted out from under its products either.
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_files" ADD CONSTRAINT "digital_files_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Money is a non-negative BIGINT rupiah integer; hpp may be null but never negative (AD-04, §4)
ALTER TABLE "products" ADD CONSTRAINT "products_price_hpp_non_negative_check" CHECK ("price" >= 0 AND ("hpp" IS NULL OR "hpp" >= 0));

-- Null stock means unlimited (digital/service); a tracked stock can never go negative (§4)
ALTER TABLE "products" ADD CONSTRAINT "products_stock_non_negative_check" CHECK ("stock" IS NULL OR "stock" >= 0);

-- images is a jsonb array of { id, path, url } — enforce shape at the storage boundary
ALTER TABLE "products" ADD CONSTRAINT "products_images_is_array_check" CHECK (jsonb_typeof("images") = 'array');

-- max_downloads is the entitlement ceiling for a signed URL; it must be a positive limit
ALTER TABLE "digital_files" ADD CONSTRAINT "digital_files_max_downloads_positive_check" CHECK ("max_downloads" > 0);

-- size_bytes drives upload validation and Content-Disposition; zero/negative is never valid
ALTER TABLE "digital_files" ADD CONSTRAINT "digital_files_size_positive_check" CHECK ("size_bytes" > 0);
