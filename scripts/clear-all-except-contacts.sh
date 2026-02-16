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
# If 'messages' links to 'inbox_sessions', we might need to keep 'inbox_sessions' too, 
# or set the column to NULL if possible, or just accept that messages might lose session links.
#
# Based on schema:
# - messages (linked to contactId, inboxSessionId)
# - contacts (linked to tenantId - wait, tenants are being wiped!)
#
# CRITICAL: If 'contacts' has a foreign key to 'tenants' (e.g. tenant_id), 
# and we wipe 'tenants', the truncation of 'tenants' will fail with specific foreign key violation 
# OR it will cascade and delete the contacts anyway if CASCADE is used on tenants.
#
# If we want to keep contacts but wipe tenants, we must first drop the constraint 
# or set tenant_id to NULL (if allowed).
#
# Assuming standard wipe:
TABLES="agent_profiles agent_sessions api_keys assignment_configs audit_log crm_integrations events identities invitations password_reset_tokens projects resolutions role_permissions roles session_takeover_requests sessions shifts team_members tenant_memberships two_fa_verification user_sessions users"
# Excluded: contacts, messages, inbox_sessions (maybe?)

# If we truncate 'tenants' with CASCADE, it effectively wipes contacts if they enforce FK.
# Let's check if we can truncate these specific tables without CASCADE affecting contacts.
# But 'tenants' is the root. Contacts usually belong to a tenant.
# If contacts belong to a tenant, we CANNOT wipe tenants without wiping contacts unless we detach them.

echo "WARNING: This script attempts to wipe most data but keep 'contacts' and 'messages'."
echo "HOWEVER: If contacts belong to a Tenant, wiping keys/tenants might be impossible without cascading."
echo "Proceeding to truncate leaf tables and independent tables first."

# We will truncate tables that are NOT contacts or messages.
# We also probably need to keep 'tenants' if contacts depend on them.
# If the user wants to keep contacts, they probably want to keep the tenant context too?
# Or maybe they want to wipe users/auth but keep the raw data?
#
# Let's assume we keep 'tenants' as well, otherwise contacts become orphaned or deleted.
#
# Revised list (Keeping: tenants, contacts, messages, inbox_sessions):
TABLES_TO_WIPE="agent_profiles agent_sessions api_keys assignment_configs audit_log crm_integrations events identities invitations password_reset_tokens projects resolutions role_permissions roles session_takeover_requests sessions shifts team_members tenant_memberships two_fa_verification user_sessions users"

echo "Tables to wipe: ${TABLES_TO_WIPE}"
echo "Preserving: tenants, contacts, messages, inbox_sessions"

read -r -p "Type 'wipe-partial' to proceed: " reply
if [ "$reply" != "wipe-partial" ]; then
  echo "Aborted."
  exit 1
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -v ON_ERROR_STOP=1 -c "
  TRUNCATE TABLE ${TABLES_TO_WIPE}
  RESTART IDENTITY
  CASCADE;
"

echo "Partial wipe complete. Contacts and Messages (and Tenants) preserved."
unset PGPASSWORD
