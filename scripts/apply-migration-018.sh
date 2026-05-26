#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/018_user_progress_reset_policies.sql"
VERIFY="$ROOT/scripts/verify-reset-policies.sql"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Falta SUPABASE_DB_URL (postgres URI desde Supabase Dashboard → Database → Connection string)"
  exit 1
fi

echo "[migration-018] applying..."
supabase db query --file "$MIGRATION" --db-url "$SUPABASE_DB_URL"

echo "[migration-018] verifying policies..."
supabase db query --file "$VERIFY" --db-url "$SUPABASE_DB_URL" -o table

echo "[migration-018] OK"
