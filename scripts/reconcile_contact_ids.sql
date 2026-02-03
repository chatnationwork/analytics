-- Reconcile duplicate contacts: same phone number stored under different forms
-- (e.g. "254745050238", "+254745050238", " +254745050238 ") so they appear as one user.
--
-- Canonical form: trim whitespace and strip leading/trailing '+'.
--
-- Run from repo root:
--   docker exec -i analytics-postgres psql -U analytics -d analytics < scripts/reconcile_contact_ids.sql
--
-- Or run directly (escape double quotes in -c string):
--   docker exec -i analytics-postgres psql -U analytics -d analytics -c '...'
--
BEGIN;
-- 1. Normalize inbox_sessions.contactId to canonical form so all sessions for the same number use the same key
UPDATE inbox_sessions
SET "contactId" = LTRIM(RTRIM(TRIM("contactId"), '+'), '+')
WHERE "contactId" <> LTRIM(RTRIM(TRIM("contactId"), '+'), '+');
-- 2. Merge duplicate contacts: compute merged rows, delete all duplicate rows, insert one row per group
WITH norm AS (
  SELECT *,
    LTRIM(RTRIM(TRIM("contactId"), '+'), '+') AS cid
  FROM contacts
),
dupe_groups AS (
  SELECT "tenantId",
    cid,
    array_agg("contactId") AS variants,
    (
      array_agg(
        "name"
        ORDER BY (
            CASE
              WHEN "name" IS NOT NULL
              AND "name" <> '' THEN 1
              ELSE 0
            END
          ) DESC
      )
    ) [1] AS best_name,
    min("firstSeen") AS first_seen,
    max("lastSeen") AS last_seen,
    sum("messageCount")::int AS total_msg,
    min("createdAt") AS created_at
  FROM norm
  GROUP BY "tenantId",
    cid
  HAVING count(*) > 1
),
merged AS (
  SELECT d."tenantId",
    d.cid AS "contactId",
    d.best_name AS "name",
    d.first_seen AS "firstSeen",
    d.last_seen AS "lastSeen",
    d.total_msg AS "messageCount",
    d.created_at AS "createdAt"
  FROM dupe_groups d
),
del AS (
  DELETE FROM contacts c
  WHERE ("tenantId", "contactId") IN (
      SELECT d."tenantId",
        unnest(d.variants)
      FROM dupe_groups d
    )
)
INSERT INTO contacts (
    "tenantId",
    "contactId",
    "name",
    "firstSeen",
    "lastSeen",
    "messageCount",
    "createdAt",
    "updatedAt"
  )
SELECT m."tenantId",
  m."contactId",
  m."name",
  m."firstSeen",
  m."lastSeen",
  m."messageCount",
  m."createdAt",
  now()
FROM merged m;
-- 3. Normalize single contact rows (no duplicates) to canonical contactId
UPDATE contacts
SET "contactId" = LTRIM(RTRIM(TRIM("contactId"), '+'), '+')
WHERE "contactId" <> LTRIM(RTRIM(TRIM("contactId"), '+'), '+');
COMMIT;