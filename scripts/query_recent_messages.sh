docker compose exec postgres psql -U analytics -d analytics -c 'SELECT * FROM messages WHERE "contactId" = '\''254745050238'\'' ORDER BY "createdAt" DESC LIMIT 10;'
