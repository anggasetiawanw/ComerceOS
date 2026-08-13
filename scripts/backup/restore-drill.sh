#!/usr/bin/env bash
# Restores a dump (default: the newest one in backups/) into a throwaway
# database, then asserts migration state, table presence/row counts, and
# ledger reconciliation before dropping it. "A backup that has never been
# restored is a hypothesis" — .docs/13-devops-testing-prod.md §3.
#
# Usage: restore-drill.sh [path/to/dump.dump]
#
# Requires DIRECT_DATABASE_URL (read from .env at the repo root if not
# already exported) to locate the Postgres server. Uses local `psql`/
# `pg_restore`/`createdb`/`dropdb` if present, otherwise falls through to
# the Docker Compose postgres service.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

if [ -z "${DIRECT_DATABASE_URL:-}" ] && [ -f "$ROOT_DIR/.env" ]; then
  DIRECT_DATABASE_URL="$(grep -m1 '^DIRECT_DATABASE_URL=' "$ROOT_DIR/.env" | cut -d= -f2-)"
fi

: "${DIRECT_DATABASE_URL:?DIRECT_DATABASE_URL is not set — check .env}"

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ]; then
  DUMP_FILE="$(ls -1t "$BACKUP_DIR"/nagihin-*.dump 2>/dev/null | head -n1 || true)"
fi
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "ERROR: no dump file found. Run 'pnpm backup:dump' first, or pass a path." >&2
  exit 1
fi

# Parse postgresql://user:pass@host:port/db out of DIRECT_DATABASE_URL.
URL="${DIRECT_DATABASE_URL#postgresql://}"
URL="${URL#postgres://}"
PG_USER="${URL%%:*}"
REST="${URL#*:}"
PG_PASSWORD="${REST%%@*}"
REST="${REST#*@}"
PG_HOST="${REST%%:*}"
REST="${REST#*:}"
PG_PORT="${REST%%/*}"
export PGPASSWORD="$PG_PASSWORD"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DRILL_DB="nagihin_drill_${TIMESTAMP}"

USE_DOCKER=0
if ! command -v psql >/dev/null 2>&1 || ! command -v pg_restore >/dev/null 2>&1; then
  USE_DOCKER=1
fi

echo "==> Restoring $DUMP_FILE into $DRILL_DB"

if [ "$USE_DOCKER" = "1" ]; then
  CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q postgres)"
  if [ -z "$CONTAINER_ID" ]; then
    echo "ERROR: no local psql/pg_restore and the Docker postgres service is not running." >&2
    echo "Run: docker compose -f docker/docker-compose.yml up -d postgres" >&2
    exit 1
  fi
  MSYS2_ARG_CONV_EXCL="/tmp" docker cp "$DUMP_FILE" "$CONTAINER_ID:/tmp/drill.dump"
  docker compose -f "$COMPOSE_FILE" exec -T postgres createdb -U "$PG_USER" "$DRILL_DB"
  MSYS2_ARG_CONV_EXCL="/tmp" docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_restore -U "$PG_USER" -d "$DRILL_DB" --no-owner --no-privileges /tmp/drill.dump
  MSYS2_ARG_CONV_EXCL="/tmp" docker compose -f "$COMPOSE_FILE" exec -T postgres rm -f /tmp/drill.dump
  run_assertions() {
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
      psql -U "$PG_USER" -d "$DRILL_DB" -v ON_ERROR_STOP=1 <"$SCRIPT_DIR/assertions.sql"
  }
  drop_drill_db() {
    docker compose -f "$COMPOSE_FILE" exec -T postgres dropdb -U "$PG_USER" "$DRILL_DB"
  }
else
  createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$DRILL_DB"
  pg_restore -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DRILL_DB" --no-owner --no-privileges "$DUMP_FILE"
  run_assertions() {
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DRILL_DB" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/assertions.sql"
  }
  drop_drill_db() {
    dropdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$DRILL_DB"
  }
fi

echo "==> Running assertions"
if run_assertions; then
  echo "==> Drill passed — dropping $DRILL_DB"
  drop_drill_db
  echo "==> RESTORE DRILL PASSED"
else
  echo "==> Drill FAILED — leaving $DRILL_DB in place for inspection." >&2
  exit 1
fi
