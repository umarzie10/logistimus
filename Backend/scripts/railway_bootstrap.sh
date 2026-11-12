#!/usr/bin/env bash
# Standalone Railway bootstrap — the same steps the api entrypoint performs
# on every start, exposed as a script for operators who want to run them by
# hand (for example after changing APP_DB_PASSWORD).
#
# Inside the api service container:
#   uv run bash scripts/railway_bootstrap.sh
#
# What it does:
#   1. provisions the non-superuser `logistimus_app` role (NOBYPASSRLS) so
#      the Row Level Security policies actually apply — a superuser bypasses
#      RLS unconditionally, even with FORCE;
#   2. runs the migrations AS that role, so the role owns the tables and
#      FORCE ROW LEVEL SECURITY binds to it;
#   3. prints the RLS convention check result.
set -euo pipefail

cd /app

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"
ADMIN_URL="${DATABASE_ADMIN_URL:-${DATABASE_URL}}"
APP_URL="postgresql://logistimus_app:${APP_DB_PASSWORD}@${PGHOST:-postgres.railway.internal}:5432/${POSTGRES_DB:-railway}"

echo "=== 1. Provision the app role (superuser connection) ==="
DATABASE_URL="$ADMIN_URL" \
    uv run python manage.py provision_app_role --password "$APP_DB_PASSWORD" \
    --settings=config.settings.prod 2>&1 | grep -v '"ts"' | tail -3

echo
echo "=== 2. Migrate AS the app role ==="
DATABASE_URL="$APP_URL" \
    uv run python manage.py migrate --noinput --settings=config.settings.prod 2>&1 \
    | grep -v '"ts"' | tail -5

echo
echo "=== 3. RLS conventions ==="
DATABASE_URL="$APP_URL" \
    uv run python manage.py check_database_conventions --settings=config.settings.prod 2>&1 \
    | grep -v '"ts"' | tail -5

echo
echo "RAILWAY_BOOTSTRAP_DONE"
