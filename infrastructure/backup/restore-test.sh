#!/usr/bin/env bash
# Logistimus — restore test IN ISOLATION.
#
# A backup is invalid until a restore test succeeds in isolation
# (docs/production/DATABASE_READINESS.md §18). This script proves one dump:
#
#   1. starts a THROWAWAY PostGIS container (no host ports, nothing shared
#      with the running stack) with the image's own /docker-entrypoint-initdb.d
#      SKIPPED — the target is a virgin database, so a green run also proves
#      the dump is self-contained (extensions, schemas, grants included)
#   2. restores the dump into it with pg_restore --exit-on-error
#   3. verifies the restored database against the source:
#        a. table list identical
#        b. per-table row counts identical
#        c. re-dump TOC identical to the original dump's TOC
#   4. removes the throwaway container on PASS (kept on FAIL for inspection)
#
# Usage:
#   infrastructure/backup/restore-test.sh <dump-file> [source-container]
#
#   source-container  docker container to compare against (e.g. the compose
#                     `db` service: `docker compose ... ps -q db`). Optional:
#                     without it only (a) and (c)-lite checks run.
#
# Environment:
#   SOURCE_USER / SOURCE_DB   credentials inside the source container
#                             (default logistimus / logistimus)
#   TARGET_CONTAINER          throwaway container name
#                             (default logistimus-restore-test)
#   KEEP_ON_FAIL=0            remove the throwaway even on failure
set -euo pipefail

DUMP="${1:?usage: restore-test.sh <dump-file> [source-container]}"
SOURCE_CONTAINER="${2:-}"
SOURCE_USER="${SOURCE_USER:-logistimus}"
SOURCE_DB="${SOURCE_DB:-logistimus}"
TARGET_CONTAINER="${TARGET_CONTAINER:-logistimus-restore-test}"
TARGET_USER=logistimus
TARGET_DB=restore_target

[ -f "$DUMP" ] || { echo "::error::dump not found: $DUMP" >&2; exit 1; }
command -v docker >/dev/null || { echo "::error::docker not available" >&2; exit 1; }

FAIL=0
EMPTY_INIT=""
note() { printf '%s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; FAIL=1; }

cleanup() {
  if [ -n "$EMPTY_INIT" ]; then rm -rf "$EMPTY_INIT"; fi
  if [ "$FAIL" -eq 0 ] || [ "${KEEP_ON_FAIL:-1}" = "0" ]; then
    docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
    note "cleanup: removed $TARGET_CONTAINER"
  else
    note "cleanup: KEPT $TARGET_CONTAINER for inspection (KEEP_ON_FAIL=0 to remove)"
  fi
}
trap cleanup EXIT

# --- 1. throwaway target -------------------------------------------------
docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
# Empty initdb dir: the image's postgis/tiger bootstrap would pre-create
# schemas the dump also contains (CREATE SCHEMA tiger -> restore error), and
# a virgin target is the honest test of a self-contained archive.
EMPTY_INIT=$(mktemp -d)
chmod 755 "$EMPTY_INIT"   # entrypoint reads it as another uid
docker run -d --name "$TARGET_CONTAINER" \
  -e POSTGRES_USER="$TARGET_USER" \
  -e POSTGRES_PASSWORD=restore-test-only \
  -e POSTGRES_DB="$TARGET_DB" \
  -v "$EMPTY_INIT:/docker-entrypoint-initdb.d:ro,z" \
  postgis/postgis:16-3.4 >/dev/null

note "waiting for $TARGET_CONTAINER/$TARGET_DB to finish init and accept queries..."
# Two conditions, because one is not enough:
#   * pg_isready / a working query also answer for the TEMPORARY init server
#     (before POSTGRES_DB exists, and while /docker-entrypoint-initdb.d is
#     still running) — restoring into that window races the image's own
#     postgis init and kills the container
#   * "server stopped" in the logs marks the shutdown of that temp server;
#     only afterwards does the real postmaster serve the database
init_done() { docker logs "$TARGET_CONTAINER" 2>&1 | grep -q "server stopped"; }
ready=0
for _ in $(seq 1 90); do
  if init_done && [ "$(docker exec "$TARGET_CONTAINER" \
      psql -U "$TARGET_USER" -d "$TARGET_DB" -Atc 'select 1' 2>/dev/null)" = "1" ]; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  if [ "$(docker inspect -f '{{.State.Running}}' "$TARGET_CONTAINER" 2>/dev/null)" != "true" ]; then
    docker logs "$TARGET_CONTAINER" 2>&1 | tail -20 >&2 || true
    fail "target container exited during init"
  else
    fail "target database never became ready"
  fi
  exit 1
fi

# --- 2. restore ----------------------------------------------------------
note "restoring $DUMP -> $TARGET_CONTAINER/$TARGET_DB"
if docker exec -i "$TARGET_CONTAINER" \
    pg_restore -U "$TARGET_USER" -d "$TARGET_DB" \
    --no-owner --no-privileges --exit-on-error < "$DUMP"; then
  note "pg_restore: OK (--exit-on-error, no errors)"
else
  fail "pg_restore reported errors"
  exit 1
fi

# --- 3a. table list ------------------------------------------------------
restored_tables=$(docker exec "$TARGET_CONTAINER" \
  psql -U "$TARGET_USER" -d "$TARGET_DB" -Atc \
  "select tablename from pg_tables where schemaname='public' order by 1")
restored_count=$(printf '%s\n' "$restored_tables" | grep -c . || true)
note "restored tables: $restored_count"

if [ -n "$SOURCE_CONTAINER" ]; then
  source_tables=$(docker exec "$SOURCE_CONTAINER" \
    psql -U "$SOURCE_USER" -d "$SOURCE_DB" -Atc \
    "select tablename from pg_tables where schemaname='public' order by 1")
  source_count=$(printf '%s\n' "$source_tables" | grep -c . || true)
  note "source tables:   $source_count"

  if [ "$source_tables" = "$restored_tables" ]; then
    note "CHECK table list: IDENTICAL ($source_count tables)"
  else
    fail "table list differs"
    note "--- only in source ---"
    comm -23 <(printf '%s\n' "$source_tables") <(printf '%s\n' "$restored_tables") || true
    note "--- only in restored ---"
    comm -13 <(printf '%s\n' "$source_tables") <(printf '%s\n' "$restored_tables") || true
  fi

  # --- 3b. per-table row counts -----------------------------------------
  mismatches=0
  compared=0
  total_rows=0
  while IFS= read -r tbl; do
    [ -n "$tbl" ] || continue
    s=$(docker exec "$SOURCE_CONTAINER" \
      psql -U "$SOURCE_USER" -d "$SOURCE_DB" -Atc "select count(*) from \"$tbl\"")
    r=$(docker exec "$TARGET_CONTAINER" \
      psql -U "$TARGET_USER" -d "$TARGET_DB" -Atc "select count(*) from \"$tbl\"")
    compared=$((compared + 1))
    total_rows=$((total_rows + s))
    if [ "$s" != "$r" ]; then
      mismatches=$((mismatches + 1))
      fail "row count $tbl: source=$s restored=$r"
    fi
  done <<< "$restored_tables"
  if [ "$mismatches" -eq 0 ]; then
    note "CHECK row counts: IDENTICAL across $compared tables ($total_rows rows total)"
  else
    fail "row count mismatches: $mismatches"
  fi
else
  note "CHECK table list: SKIPPED (no source container given)"
  note "CHECK row counts: SKIPPED (no source container given)"
fi

# --- 3c. structure: original dump TOC vs re-dump of the restored DB ------
# pg_restore runs INSIDE the container (the host has no postgres client).
# Fields: dumpId; classid objid desc ... — objid is a per-database OID and
# differs by construction, so it is dropped before comparing; classid/desc/
# name/owner must match exactly.
toc_entries() { docker exec -i "$TARGET_CONTAINER" pg_restore --list 2>/dev/null \
  | grep -E '^[0-9]+;' \
  | sed -E 's/^[0-9]+;[[:space:]]*//' \
  | awk '{ $2 = ""; $1 = $1; print }'; }
orig_toc=$(toc_entries < "$DUMP")
redo_tmp=$(mktemp)
docker exec "$TARGET_CONTAINER" \
  pg_dump -U "$TARGET_USER" -d "$TARGET_DB" -Fc > "$redo_tmp"
redo_toc=$(toc_entries < "$redo_tmp")
rm -f "$redo_tmp"

orig_n=$(printf '%s\n' "$orig_toc" | grep -c . || true)
redo_n=$(printf '%s\n' "$redo_toc" | grep -c . || true)
if [ "$orig_n" -lt 20 ]; then
  # two empty outputs would otherwise compare equal and pass vacuously
  fail "original dump TOC has only $orig_n entries — pg_restore --list failed?"
fi
if [ "$orig_toc" = "$redo_toc" ] && [ "$orig_n" -ge 20 ]; then
  note "CHECK TOC structure: IDENTICAL ($orig_n entries vs $redo_n)"
else
  fail "TOC structure differs ($orig_n vs $redo_n entries)"
  diff <(printf '%s\n' "$orig_toc") <(printf '%s\n' "$redo_toc") | head -20 || true
fi

# --- verdict -------------------------------------------------------------
if [ "$FAIL" -eq 0 ]; then
  echo "RESTORE_TEST_PASS dump=$DUMP target=$TARGET_CONTAINER tables=$restored_count"
  exit 0
fi
echo "RESTORE_TEST_FAIL dump=$DUMP target=$TARGET_CONTAINER" >&2
exit 1
