-- Migration 013b — guest buyer login method exception
-- Sprint 9, Path B (.docs/12-roadmap-sprints.md)
--
-- .docs/04-entity-design.md and .docs/06-database-roadmap.md document
-- "a user must always retain at least one login method" as a hard
-- invariant, enforced by migration 002's users_has_login_method_check.
-- Sprint 9's manual-order flow introduces the one deliberate exception:
-- BuyerDirectoryService.findOrCreateByEmail registers a passwordless,
-- Google-less guest buyer (role = 'buyer') so a Path B order always has a
-- real buyer_id. The guest claims the account later via /lupa-password —
-- until then, this row legitimately has no login method.
--
-- The exception is scoped to role = 'buyer' only. No code path ever
-- creates a seller or admin without a real login method (registerFromGoogle
-- / registerWithPassword always set one; admin promotion is the manual
-- grant-admin script against an existing row), so the invariant still
-- holds unconditionally for those two roles.
--
-- Rollback (manual, if ever needed — first delete any row this exception
-- allowed, or the original constraint will reject re-adding it):
--   ALTER TABLE "users" DROP CONSTRAINT "users_has_login_method_check";
--   ALTER TABLE "users" ADD CONSTRAINT "users_has_login_method_check"
--     CHECK ("google_id" IS NOT NULL OR "password_hash" IS NOT NULL);

ALTER TABLE "users" DROP CONSTRAINT "users_has_login_method_check";

ALTER TABLE "users" ADD CONSTRAINT "users_has_login_method_check"
  CHECK ("google_id" IS NOT NULL OR "password_hash" IS NOT NULL OR "role" = 'buyer');
