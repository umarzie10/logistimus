#!/usr/bin/env bash
# Logistimus — database backup (pg_dump custom format) with archive validation
# and retention. Run on the deploy host from anywhere; it locates the checkout
# itself (or takes it as $1).
#
# Usage:
#   infrastructure/backup/backup.sh [repo_dir]
#
# Environment:
#   BACKUP_DIR      where dumps land           (default <repo>/backups)
#   RETENTION_DAYS  age after which dumps die   (default 14)
#   POSTGRES_USER / POSTGRES_DB                (default: read from <repo>/.env,
#                                               then logistimus)
#
# Guarantees:
#   * fails if the checkout or its compose env file is missing (no silent
#     defaults that could dump the wrong database)
#   * every dump is validated with `pg_restore --list` before it is accepted;
#     an unreadable archive is deleted and the run fails
#   * the newest dump is never deleted by retention
#
# Off-host copy: set BACKUP_COPY_TARGET=user@host:/path (or a local path) to
# scp every validated dump elsewhere; a failed copy fails the run. Default is
# off — dumps stay on this host (docs/production/BACKUP_RECOVERY.md §6).
set -euo pipefail

REPO_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$REPO_DIR"

[ -f docker-compose.deploy.yml ] || {
  echo "::error::docker-compose.deploy.yml not found in $REPO_DIR" >&2
  exit 1
}
[ -f .env ] || {
  echo "::error::compose env file missing: $REPO_DIR/.env — copy .env.example and fill it in" >&2
  exit 1
}

BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

# Compose interpolation values live in .env and are NOT exported to this
# shell — read them explicitly instead of assuming the defaults.
envval() { sed -n "s/^$1=//p" .env | head -1; }
POSTGRES_USER="${POSTGRES_USER:-$(envval POSTGRES_USER)}"
POSTGRES_USER="${POSTGRES_USER:-logistimus}"
POSTGRES_DB="${POSTGRES_DB:-$(envval POSTGRES_DB)}"
POSTGRES_DB="${POSTGRES_DB:-logistimus}"

OUT="$BACKUP_DIR/logistimus-$STAMP.dump"
echo "dumping $POSTGRES_DB (user $POSTGRES_USER) -> $OUT"

docker compose -f docker-compose.deploy.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT"

# --- validate the archive before trusting it -----------------------------
[ -s "$OUT" ] || {
  echo "::error::dump is empty — deleting $OUT" >&2
  rm -f "$OUT"
  exit 1
}
TOC_LINES=$(docker compose -f docker-compose.deploy.yml exec -T db \
  pg_restore --list < "$OUT" | wc -l | tr -d ' ')
if [ "$TOC_LINES" -lt 20 ]; then
  echo "::error::dump TOC has only $TOC_LINES lines — archive unreadable, deleting $OUT" >&2
  rm -f "$OUT"
  exit 1
fi
TABLES=$(docker compose -f docker-compose.deploy.yml exec -T db \
  pg_restore --list < "$OUT" | grep -c 'TABLE DATA' || true)
# Sanity: the archive must cover at least every public table the live DB has
# (a truncated dump would otherwise still look "valid" to the TOC check).
DB_TABLES=$(docker compose -f docker-compose.deploy.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "select count(*) from pg_tables where schemaname='public'")
if [ "$TABLES" -lt "$DB_TABLES" ]; then
  echo "::error::dump covers $TABLES tables but the database has $DB_TABLES — archive incomplete, deleting $OUT" >&2
  rm -f "$OUT"
  exit 1
fi

# --- retention (never touches today's dump) -----------------------------
DELETED=0
while IFS= read -r old; do
  [ -n "$old" ] || continue
  rm -f "$old"
  DELETED=$((DELETED + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'logistimus-*.dump' \
          -mtime +"$RETENTION_DAYS" ! -samefile "$OUT" 2>/dev/null)

KEPT=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'logistimus-*.dump' | wc -l | tr -d ' ')
BYTES=$(wc -c < "$OUT" | tr -d ' ')

# --- optional off-host copy (BACKUP_COPY_TARGET) ------------------------
# e.g. BACKUP_COPY_TARGET=backup@nas:/srv/logistimus-backups
# or    BACKUP_COPY_TARGET=/mnt/nas/logistimus-backups
# Not configured by default — see BACKUP_RECOVERY.md §6.
if [ -n "${BACKUP_COPY_TARGET:-}" ]; then
  dest="${BACKUP_COPY_TARGET%/}/$(basename "$OUT")"
  if scp -o BatchMode=yes -o ConnectTimeout=15 "$OUT" "$dest"; then
    echo "COPIED_OK dest=$dest"
  else
    echo "::error::off-host copy to $BACKUP_COPY_TARGET failed — the dump exists locally but NOT remotely" >&2
    exit 1
  fi
fi

echo "BACKUP_OK file=$OUT bytes=$BYTES toc_lines=$TOC_LINES tables=$TABLES kept=$KEPT pruned=$DELETED retention_days=$RETENTION_DAYS"
if [ -z "${BACKUP_COPY_TARGET:-}" ]; then
  echo "NOTE: dump is local to this host only — off-host copy is NOT configured (see BACKUP_RECOVERY.md §6)."
fi
