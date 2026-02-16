#!/usr/bin/env bash
#
# Truncate all tables EXCEPT 'contacts' and 'messages'.
# Preserves chat history and contact list while wiping users, tenants, sessions, etc.
#
# Usage:
#   CONFIRM_CLEAR_EXCEPT_CONTACTS=yes ./scripts/clear-all-except-contacts.sh
#
set -euo pipefail

if [ "${CONFIRM_CLEAR_EXCEPT_CONTACTS:-}" != "yes" ]; then
  echo "Refusing to run without CONFIRM_CLEAR_EXCEPT_CONTACTS=yes"
  exit 1
fi

DB_HOST="${DB_HOST:?Set DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:?Set DB_USERNAME}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE:?Set DB_DATABASE}"
export PGPASSWORD="$DB_PASSWORD"

# List of tables to TRUNCATE (all except contacts and messages)
# Note: 'messages' depends on 'contacts' (and maybe 'inbox_sessions'?).
# We preserve tenants, contacts, messages, inbox_sessions.
TABLES_TO_WIPE="agent_profiles agent_sessions api_keys assignment_configs audit_log crm_integrations events identities invitations password_reset_tokens projects resolutions role_permissions roles session_takeover_requests sessions shifts team_members tenant_memberships two_fa_verification user_sessions users"

echo "Tables to wipe: ${TABLES_TO_WIPE}"
echo "Preserving: tenants, contacts, messages, inbox_sessions"

read -r -p "Type 'wipe-partial' to proceed: " reply
if [ "$reply" != "wipe-partial" ]; then
  echo "Aborted."
  exit 1
fi

# Convert space-separated list to comma-separated for SQL
TABLES_SQL=$(echo "$TABLES_TO_WIPE" | tr ' ' ',')
SQL_CMD="TRUNCATE TABLE ${TABLES_SQL} RESTART IDENTITY CASCADE;"

if command -v psql >/dev/null 2>&1; then
  # Run via local psql
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -v ON_ERROR_STOP=1 -c "$SQL_CMD"
elif command -v docker >/dev/null 2>&1; then
  # Fallback to docker exec
  echo "psql not found, trying docker exec..."
  docker exec -i -e PGPASSWORD="$DB_PASSWORD" analytics-postgres psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "$SQL_CMD"
else
  echo "Error: Neither psql nor docker found."
  exit 1
fi

echo "Partial wipe complete. Contacts and Messages (and Tenants) preserved."
unset PGPASSWORD
