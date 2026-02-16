#!/usr/bin/env bash
#
# Truncate all tables in the analytics database (full wipe).
# Requires explicit CONFIRM_CLEAR_PROD_DB=yes and DB_* env vars.
#
# Usage:
#   CONFIRM_CLEAR_PROD_DB=yes DB_HOST=... DB_USERNAME=... DB_PASSWORD=... DB_DATABASE=... ./scripts/clear-prod-db.sh
#
set -euo pipefail

if [ "${CONFIRM_CLEAR_PROD_DB:-}" != "yes" ]; then
  echo "Refusing to run without CONFIRM_CLEAR_PROD_DB=yes"
  exit 1
fi

DB_HOST="${DB_HOST:?Set DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:?Set DB_USERNAME}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE:?Set DB_DATABASE}"
export PGPASSWORD="$DB_PASSWORD"

# All tables in public schema (matches TypeORM entities). CASCADE truncates dependents.
TABLES="agent_profiles agent_sessions api_keys assignment_configs audit_log contact_notes contacts crm_integrations events identities inbox_sessions invitations messages password_reset_tokens projects resolutions role_permissions roles session_takeover_requests sessions shifts team_members teams tenant_memberships tenants two_fa_verification user_sessions users"

echo "WARNING: About to TRUNCATE all tables in database ${DB_DATABASE} at ${DB_HOST}."
read -r -p "Type 'wipe' to proceed: " reply
if [ "$reply" != "wipe" ]; then
  echo "Aborted."
  unset PGPASSWORD
  exit 1
fi

SQL_CMD="TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE;"

if command -v psql >/dev/null 2>&1; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -v ON_ERROR_STOP=1 -c "$SQL_CMD"
elif command -v docker >/dev/null 2>&1; then
  echo "psql not found, trying docker exec..."
  docker exec -i -e PGPASSWORD="$DB_PASSWORD" analytics-postgres psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "$SQL_CMD"
else
  echo "Error: Neither psql nor docker found."
  unset PGPASSWORD
  exit 1
fi

echo "All tables truncated."
unset PGPASSWORD
