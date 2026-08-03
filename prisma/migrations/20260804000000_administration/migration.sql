-- Migration 012 — administration
-- .docs/06-database-roadmap.md §1 · .docs/03-bounded-contexts.md §3.13
-- .docs/brief/database-schema.md §audit_logs · Sprint 7 (.docs/12-roadmap-sprints.md)
--
-- ActorType (user/admin/system) is deliberately distinct from ordering's
-- StatusActorType (system/seller/buyer/admin) — audit_logs uses the
-- coarser split from brief/database-schema.md, where 'user' covers both
-- buyer and seller actions.
--
-- WithdrawalStatus gains 'approved' — not in the original Sprint 6 schema.
-- .docs/05-api-roadmap.md §15 lists /approve and /mark-paid as separate P0
-- admin endpoints and .docs/09-payments-ledger.md §7's sequence diagram
-- puts a manual bank transfer between them; without a distinct status an
-- admin cannot tell which requests they have already picked up. approved_at/
-- rejected_at/reviewed_by_id let the admin queue list avoid joining
-- audit_logs for "who reviewed this".
--
-- Rollback (manual, if ever needed):
--   DROP INDEX IF EXISTS "balance_transactions_withdrawal_movement_uniq";
--   ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_fkey";
--   ALTER TABLE "withdrawals" DROP CONSTRAINT IF EXISTS "withdrawals_reviewed_by_id_fkey";
--   DROP TABLE IF EXISTS "audit_logs";
--   ALTER TABLE "withdrawals" DROP COLUMN IF EXISTS "approved_at", DROP COLUMN IF EXISTS "rejected_at", DROP COLUMN IF EXISTS "reviewed_by_id";
--   DROP TYPE IF EXISTS "ActorType";
-- 'approved' cannot be removed from WithdrawalStatus without a full enum
-- rebuild once any row uses it — Postgres has no DROP VALUE.

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('user', 'admin', 'system');

-- AlterEnum
ALTER TYPE "WithdrawalStatus" ADD VALUE 'approved';

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" TEXT;

-- CreateTable
-- Written once per mutating action, from every context, through
-- AuditLogPort (.docs/03 §3.13's "one intentional cross-context write
-- path"). actor_id SET NULL on user deletion — the trail must survive the
-- acting user's account being removed later.
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Entity audit trail (.docs/06 §3)
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
-- Actor audit trail (.docs/06 §3)
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
-- Backs GET /admin/audit-logs's action filter — not in .docs/06 §3's table
-- but the API roadmap's "filter by actor, entity, action, date" needs it.
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
-- One ledger row per withdrawal for the 'withdrawal_paid' movement — the DB
-- half of WithdrawalService.markPaid's replay guard, same hand-written
-- partial-unique-index precedent as migration 007's two indexes (Prisma
-- cannot express the WHERE predicate in @@index).
CREATE UNIQUE INDEX "balance_transactions_withdrawal_movement_uniq" ON "balance_transactions"("withdrawal_id", "type") WHERE "withdrawal_id" IS NOT NULL AND "type" = 'withdrawal_paid';

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
