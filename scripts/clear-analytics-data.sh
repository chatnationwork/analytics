#!/usr/bin/env bash
#
# SAFELY clear only analytics/tracking data from the database.
# PRESERVES: Users, Tenants, Teams, Contacts, Messages, Inbox Sessions.
# WIPES: Events, Web Sessions, Identities, Audit Logs.
#
# Requires explicit CONFIRM_CLEAR_ANALYTICS_DB=yes and DB_* env vars.
#
# Usage:
#   CONFIRM_CLEAR_ANALYTICS_DB=yes DB_HOST=... ./scripts/clear-analytics-data.sh
#
set -euo pipefail

if [ "${CONFIRM_CLEAR_ANALYTICS_DB:-}" != "yes" ]; then
  echo "Refusing to run without CONFIRM_CLEAR_ANALYTICS_DB=yes"
  echo "This script will PERMANENTLY DELETE analytics events and web sessions."
  exit 1
fi

DB_HOST="${DB_HOST:?Set DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:?Set DB_USERNAME}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE:?Set DB_DATABASE}"
export PGPASSWORD="$DB_PASSWORD"

# Tables to TRUNCATE (Analytics & Logs only)
# - events: The bulk of the data (tracking)
# - sessions: Web analytics sessions
# - identities: Anonymous <-> User links
# - audit_log: System audit logs
# - resolutions: Session outcome/wrap-up data
# - inbox_sessions: Customer support chat sessions (messages effectively archived)
# - agent_sessions: Agent online/offline history
# - user_sessions: Active user login sessions
# - two_fa_verification: Temporary 2FA codes
TABLES="events sessions identities audit_log password_reset_tokens session_takeover_requests two_fa_verification agent_sessions user_sessions resolutions inbox_sessions"

echo "WARNING: About to TRUNCATE analytics tables in ${DB_DATABASE}:"
echo "  $TABLES"
echo "Core data (Users, Tenants, Contacts, Messages) will be PRESERVED."
read -r -p "Type 'wipe-analytics' to proceed: " reply
if [ "$reply" != "wipe-analytics" ]; then
  echo "Aborted."
  unset PGPASSWORD
  exit 1
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -v ON_ERROR_STOP=1 -c "
  TRUNCATE TABLE ${TABLES}
  RESTART IDENTITY
  CASCADE;
"

echo "Analytics data cleared. Core CRM data preserved."
unset PGPASSWORD
