-- Merge multiple pending (unassigned/assigned) sessions for the same contact into one.
-- For each (tenantId, contactId) with more than one pending session:
--   - Pick primary: assigned over unassigned, then most recent lastMessageAt.
--   - Move all messages from other sessions to the primary.
--   - Delete resolutions on non-primary sessions (pending sessions rarely have any).
--   - Delete the non-primary sessions.
--
-- Run from repo root:
--   docker exec -i analytics-postgres psql -U analytics -d analytics < scripts/merge_pending_sessions.sql
--
BEGIN;
-- 1. Move messages from duplicate pending sessions to the primary session
WITH pending AS (
  SELECT id,
    "tenantId",
    "contactId",
    status,
    "lastMessageAt",
    row_number() OVER (
      PARTITION BY "tenantId",
      "contactId"
      ORDER BY (
          CASE
            status
            WHEN 'assigned' THEN 1
            WHEN 'unassigned' THEN 2
            ELSE 3
          END
        ),
        "lastMessageAt" DESC NULLS LAST,
        "createdAt" DESC
    ) AS rn
  FROM inbox_sessions
  WHERE status IN ('unassigned', 'assigned')
),
groups_with_dupes AS (
  SELECT "tenantId",
    "contactId"
  FROM pending
  GROUP BY "tenantId",
    "contactId"
  HAVING count(*) > 1
),
primary_sessions AS (
  SELECT p.id AS primary_id,
    p."tenantId",
    p."contactId"
  FROM pending p
    JOIN groups_with_dupes g ON g."tenantId" = p."tenantId"
    AND g."contactId" = p."contactId"
  WHERE p.rn = 1
),
duplicate_sessions AS (
  SELECT p.id AS duplicate_id,
    pr.primary_id
  FROM pending p
    JOIN primary_sessions pr ON pr."tenantId" = p."tenantId"
    AND pr."contactId" = p."contactId"
  WHERE p.rn > 1
)
UPDATE messages m
SET "sessionId" = d.primary_id
FROM duplicate_sessions d
WHERE m."sessionId" = d.duplicate_id;
-- 2. Remove resolutions for sessions we are about to delete (so FK allows delete)
WITH pending AS (
  SELECT id,
    "tenantId",
    "contactId",
    row_number() OVER (
      PARTITION BY "tenantId",
      "contactId"
      ORDER BY (
          CASE
            status
            WHEN 'assigned' THEN 1
            WHEN 'unassigned' THEN 2
            ELSE 3
          END
        ),
        "lastMessageAt" DESC NULLS LAST,
        "createdAt" DESC
    ) AS rn
  FROM inbox_sessions
  WHERE status IN ('unassigned', 'assigned')
),
groups_with_dupes AS (
  SELECT "tenantId",
    "contactId"
  FROM pending
  GROUP BY "tenantId",
    "contactId"
  HAVING count(*) > 1
),
duplicate_ids AS (
  SELECT p.id
  FROM pending p
    JOIN groups_with_dupes g ON g."tenantId" = p."tenantId"
    AND g."contactId" = p."contactId"
  WHERE p.rn > 1
)
DELETE FROM resolutions r
WHERE r."sessionId" IN (
    SELECT id
    FROM duplicate_ids
  );
-- 3. Delete duplicate pending sessions (messages already moved)
WITH pending AS (
  SELECT id,
    "tenantId",
    "contactId",
    row_number() OVER (
      PARTITION BY "tenantId",
      "contactId"
      ORDER BY (
          CASE
            status
            WHEN 'assigned' THEN 1
            WHEN 'unassigned' THEN 2
            ELSE 3
          END
        ),
        "lastMessageAt" DESC NULLS LAST,
        "createdAt" DESC
    ) AS rn
  FROM inbox_sessions
  WHERE status IN ('unassigned', 'assigned')
),
groups_with_dupes AS (
  SELECT "tenantId",
    "contactId"
  FROM pending
  GROUP BY "tenantId",
    "contactId"
  HAVING count(*) > 1
),
duplicate_ids AS (
  SELECT p.id
  FROM pending p
    JOIN groups_with_dupes g ON g."tenantId" = p."tenantId"
    AND g."contactId" = p."contactId"
  WHERE p.rn > 1
)
DELETE FROM inbox_sessions
WHERE id IN (
    SELECT id
    FROM duplicate_ids
  );
COMMIT;