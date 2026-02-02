#!/bin/sh
# Run pending DB migrations, then start the Dashboard API.
# Migrations run with the same DB_* env vars as the app (from docker-compose).

set -e

echo "Running database migrations..."
npm run db:migrate

echo "Starting Dashboard API..."
exec node dist/apps/dashboard-api/main.js
