# Inbox "Unknown User" – Source & Prod Debug

## Where it comes from

- **UI:** `packages/dashboard-ui/components/agent-inbox/ChatList.tsx` shows a session’s display name as `session.contactName || session.contactId || "Unknown User"`.
- **Data:** Sessions come from the inbox API; `contactName` is the `contact_name` column on `inbox_sessions` (nullable). When it’s null or empty, the UI used to show "Unknown User"; it now falls back to `contactId` (e.g. phone) when `contactName` is missing.
- **Set when:** `contact_name` is set only when a session is **created** with a name:
  - **Handover** (`POST /agent/integration/handover`): uses `dto.name` in `getOrCreateSession(..., dto.name, ...)`. If the bot doesn’t send `name`, the new session has null `contact_name`. Reusing an existing session does not update `contact_name`.
  - **Processor** (inbox sync from events): when creating/updating a session it can set name from event props or fall back to `contactId`.
- So "Unknown User" (or previously no fallback) appears when:
  - Handover is called without a `name` in the body, or
  - The session was created earlier without a name and was never updated.

## Docker commands to check in prod

Assume Postgres is running in Docker (e.g. `docker-compose` with a `postgres` service). Replace container name and DB credentials if yours differ.

**1. List inbox sessions with null/empty contact name**

```bash
# If DB is in a container named postgres (e.g. docker-compose)
docker exec -it <postgres_container_name> psql -U analytics -d analytics -c "
  SELECT id, \"tenantId\", \"contactId\", \"contactName\", status, \"createdAt\"
  FROM inbox_sessions
  WHERE \"contactName\" IS NULL OR TRIM(\"contactName\") = ''
  ORDER BY \"createdAt\" DESC
  LIMIT 20;
"
```

(Column names are camelCase in this schema: `"contactName"`, `"tenantId"`, `"contactId"`, `"createdAt"`.)

**2. Count how many sessions have no name**

```bash
docker exec -it <postgres_container_name> psql -U analytics -d analytics -c "
  SELECT COUNT(*) AS sessions_without_name
  FROM inbox_sessions
  WHERE \"contactName\" IS NULL OR TRIM(\"contactName\") = '';
"
```

**3. See if contacts table has names we could use (for backfill)**

```bash
docker exec -it <postgres_container_name> psql -U analytics -d analytics -c "
  SELECT c.\"tenantId\", c.\"contactId\", c.name
  FROM contacts c
  WHERE c.name IS NOT NULL AND TRIM(c.name) != ''
  LIMIT 10;
"
```

**4. Find the Postgres container name (if unsure)**

```bash
docker ps --format "table {{.Names}}\t{{.Image}}" | grep -i postgres
```

Use that name in place of `<postgres_container_name>` above (e.g. `analytics-postgres-1` or `postgres`).

## Fixing the data (optional)

- **Upstream:** Ensure the bot (or caller) sends `name` in the handover body when available so new sessions get a name.
- **Backfill:** If you have names in the `contacts` table, you can backfill `inbox_sessions.contact_name` from `contacts.name` by matching `tenant_id` + `contact_id` (exact SQL depends on your column naming).
- **UI:** The UI now falls back to `session.contactId` when `contactName` is missing, so at least the phone number (or external ID) is shown instead of "Unknown User".
