#!/usr/bin/env bash
#
# SAFELY clear only CUSTOMER SUPPORT SESSIONS ("Inbox Tickets").
#
# Does NOT clear:
# - Web Analytics (page views, sessions, events)
# - Agent Logs (login/logout times)
# - User logins
# - Messages (preserved, just detached from session)
# - Contacts (preserved)
#
# Usage:
#   CONFIRM_CLEAR_INBOX=yes DB_HOST=... ./scripts/clear-sessions-only.sh
#
set -euo pipefail

if [ "${CONFIRM_CLEAR_INBOX:-}" != "yes" ]; then
  echo "Refusing to run without CONFIRM_CLEAR_INBOX=yes"
  echo "This script will PERMANENTLY DELETE all inbox sessions and wrap-up reports."
  exit 1
fi

DB_HOST="${DB_HOST:?Set DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:?Set DB_USERNAME}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE:?Set DB_DATABASE}"
export PGPASSWORD="$DB_PASSWORD"

echo "WARNING: About to DELETE INBOX SESSIONS in ${DB_DATABASE}."
echo "Messages and Contacts will be PRESERVED."
read -r -p "Type 'wipe-inbox' to proceed: " reply
if [ "$reply" != "wipe-inbox" ]; then
  echo "Aborted."
  unset PGPASSWORD
  exit 1
fi

# Check if psql is available on host
if command -v psql &> /dev/null; then
  # Run on host
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -v ON_ERROR_STOP=1 -c "
    BEGIN;
    -- Support Chats & Reports
    DELETE FROM resolutions;
    DELETE FROM inbox_sessions;
    -- Analytics Events for Inbox (resolutions, transfers, handoffs)
    DELETE FROM events WHERE \"eventName\" IN ('chat.resolved', 'chat.transferred', 'agent.handoff', 'chat.assigned', 'chat.accepted');
    
    COMMIT;
  "
else
  echo "psql not found on host. Attempting to run via Docker..."
  # If running via docker compose, we don't need PGPASSWORD as env var usually, 
  # but here we pass it explicitly or rely on container env vars.
  # Assuming standard docker-compose service name 'postgres'
  
  # We use the container's internal environment variables for auth
  docker compose exec -T postgres psql -U "$DB_USERNAME" -d "$DB_DATABASE" -v ON_ERROR_STOP=1 -c "
    BEGIN;
    -- Support Chats & Reports
    DELETE FROM resolutions;
    DELETE FROM inbox_sessions;
    -- Analytics Events for Inbox (resolutions, transfers, handoffs)
    DELETE FROM events WHERE \"eventName\" IN ('chat.resolved', 'chat.transferred', 'agent.handoff', 'chat.assigned', 'chat.accepted');
    
    COMMIT;
  "
fi

echo "Inbox sessions cleared. Messages preserved."
unset PGPASSWORD
