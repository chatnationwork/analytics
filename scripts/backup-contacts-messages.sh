#!/usr/bin/env bash
#
# Backup contacts and their messages (and related inbox/notes) from the analytics DB.
# Uses DB_* env vars (e.g. from .env.production). Writes to ./backups/contacts-messages/<timestamp>.
#
# Usage:
#   DB_HOST=... DB_PORT=... DB_USERNAME=... DB_PASSWORD=... DB_DATABASE=... ./scripts/backup-contacts-messages.sh
#   Or: set in .env.production and run: source .env.production && ./scripts/backup-contacts-messages.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${REPO_ROOT}/backups/contacts-messages"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

# DB connection (no defaults for prod safety)
DB_HOST="${DB_HOST:?Set DB_HOST}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:?Set DB_USERNAME}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE:?Set DB_DATABASE}"
export PGPASSWORD="$DB_PASSWORD"

mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

echo "Backing up to ${BACKUP_DIR} ..."

# Data-only dump of contacts, messages, contact_notes, inbox_sessions (context for messages)
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" \
  --data-only \
  --no-owner \
  --no-privileges \
  -t contacts \
  -t messages \
  -t contact_notes \
  -t inbox_sessions \
  -t resolutions \
  -f data-contacts-messages.sql

# Optional: also export as CSV for contacts and messages (easier to inspect)
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -A -F',' -c "\COPY (SELECT * FROM contacts ORDER BY \"tenantId\", \"contactId\") TO 'contacts.csv' WITH (FORMAT csv, HEADER true);"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -A -F',' -c "\COPY (SELECT * FROM messages ORDER BY \"createdAt\") TO 'messages.csv' WITH (FORMAT csv, HEADER true);"

echo "Done. Backup in ${BACKUP_DIR}"
echo "  - data-contacts-messages.sql  (restore with: psql ... -f data-contacts-messages.sql)"
echo "  - contacts.csv, messages.csv  (human-readable)"

unset PGPASSWORD
