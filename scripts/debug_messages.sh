#!/bin/bash
# Query messages for user 254745050238
# Uses docker compose to execute psql inside the postgres container.
# Assumes 'postgres' service name and database 'analytics'.
# Note: "contactId" is quoted to respect case sensitivity if created by TypeORM sync.

docker compose exec postgres psql -U postgres -d analytics -c 'SELECT * FROM messages WHERE "contactId" = '\''254745050238'\'';'
