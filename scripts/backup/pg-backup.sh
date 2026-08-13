#!/usr/bin/env bash
# Dumps the Nagihin Postgres database with pg_dump -Fc into backups/, then
# applies a retention sweep. See .docs/13-devops-testing-prod.md §3 "Backups
# and restore drill" for the full picture — this script is the dump half;
# restore-drill.sh is the half that proves a dump is actually restorable.
#
# Requires DIRECT_DATABASE_URL (read from .env at the repo root if not
# already exported). Uses a local `pg_dump` if present, otherwise falls
# through to the Docker Compose postgres service — so this runs unchanged
# on a dev machine or on the VPS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
KEEP="${BACKUP_KEEP:-14}"

if [ -z "${DIRECT_DATABASE_URL:-}" ] && [ -f "$ROOT_DIR/.env" ]; then
  DIRECT_DATABASE_URL="$(grep -m1 '^DIRECT_DATABASE_URL=' "$ROOT_DIR/.env" | cut -d= -f2-)"
fi

: "${DIRECT_DATABASE_URL:?DIRECT_DATABASE_URL is not set — check .env}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$BACKUP_DIR/nagihin-$TIMESTAMP.dump"

echo "==> Dumping database to $DUMP_FILE"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump -Fc --no-owner --no-privileges --dbname="$DIRECT_DATABASE_URL" -f "$DUMP_FILE"
elif docker compose -f "$ROOT_DIR/docker/docker-compose.yml" ps postgres 2>/dev/null | grep -q postgres; then
  echo "    (local pg_dump not found — using the Docker postgres service)"
  docker compose -f "$ROOT_DIR/docker/docker-compose.yml" exec -T postgres \
    pg_dump -Fc --no-owner --no-privileges -U nagihin -d nagihin >"$DUMP_FILE"
else
  echo "ERROR: no local pg_dump on PATH and the Docker postgres service is not running." >&2
  echo "Install the Postgres client tools, or run: docker compose -f docker/docker-compose.yml up -d postgres" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "==> Wrote $DUMP_FILE ($SIZE)"

echo "==> Applying retention (keep newest $KEEP)"
# shellcheck disable=SC2012
ls -1t "$BACKUP_DIR"/nagihin-*.dump 2>/dev/null | tail -n "+$((KEEP + 1))" | while read -r old; do
  echo "    removing $old"
  rm -f "$old"
done

echo "==> Done. Verify it with: pnpm backup:drill"
