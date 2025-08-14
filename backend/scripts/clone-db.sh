#!/usr/bin/env bash
set -euo pipefail

# Clone production DB into development DB
# Requires:
# - pg_dump and psql installed
# - backend/.env with DATABASE_URL (prod) and DEV_DATABASE_URL (dev)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

# Load env vars
if [[ -f "$ENV_FILE" ]]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
else
  echo "Error: $ENV_FILE not found. Create it from .env.example with DATABASE_URL and DEV_DATABASE_URL." >&2
  exit 1
fi

PROD_URL="${DATABASE_URL:-}"
DEV_URL="${DEV_DATABASE_URL:-}"

if [[ -z "$PROD_URL" || -z "$DEV_URL" ]]; then
  echo "Error: DATABASE_URL and DEV_DATABASE_URL must be set in $ENV_FILE" >&2
  exit 1
fi

# Create dev database if it doesn't exist
# Extract database name and admin connection string (host/user/port only)
parse_dbname() {
  local url="$1"
  # Extract part after last '/'
  echo "$url" | sed -E 's|.*/||' | sed -E 's|\?.*||'
}

DEV_DB_NAME="$(parse_dbname "$DEV_URL")"

# Attempt to create the dev database (ignore error if exists)
# Use psql with the same DEV_URL but connect to default 'postgres' database if possible
DEV_URL_ADMIN="${DEV_URL%/*}/postgres"

echo "[clone-db] Ensuring dev database '$DEV_DB_NAME' exists..."
psql "$DEV_URL_ADMIN" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DEV_DB_NAME\";" 2>/dev/null || echo "[clone-db] Database already exists."

# Dump production (schema + data)
DUMP_FILE="$BACKEND_DIR/data/prod_dump_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p "$BACKEND_DIR/data"

echo "[clone-db] Dumping production DB..."
pg_dump --no-owner --no-privileges --format=plain "$PROD_URL" > "$DUMP_FILE"

# Restore into dev
echo "[clone-db] Restoring into development DB..."
psql "$DEV_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "[clone-db] Done. Dump saved at $DUMP_FILE"
