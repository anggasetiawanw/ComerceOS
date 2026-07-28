-- Migration 001 — init_extensions
-- .docs/06-database-roadmap.md §1
--
-- Rollback (manual, if ever needed):
--   DROP EXTENSION IF EXISTS "citext";
--   DROP EXTENSION IF EXISTS "pgcrypto";
-- Safe to drop only if no column uses citext and nothing depends on pgcrypto's
-- functions (gen_random_uuid, digest, etc.) — check before running in production.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
