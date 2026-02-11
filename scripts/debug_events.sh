#!/bin/bash
# Query analytics events for user 254745050238
# Uses docker compose to execute psql inside the postgres container.
# Assumes 'postgres' service name and database 'analytics'.
# Note: "userId" and "timestamp" are quoted to respect case sensitivity/reserved words.

docker compose exec postgres psql -U analytics -d analytics -c 'SELECT * FROM events WHERE "userId" = '\''254745050238'\'' ORDER BY "timestamp" DESC LIMIT 10;'
