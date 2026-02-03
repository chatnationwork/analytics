-- Clean phone numbers in the DB: remove leading/trailing '+' and trim whitespace.
--
-- Run from repo root:
--   docker exec -i analytics-postgres psql -U analytics -d analytics < scripts/clean_phone_numbers.sql
--
-- Or run each block in psql:
--   docker exec -it analytics-postgres psql -U analytics -d analytics
BEGIN;
-- 1. inbox_sessions.contactId
UPDATE inbox_sessions
SET "contactId" = LTRIM(RTRIM(TRIM("contactId"), '+'), '+')
WHERE "contactId" <> LTRIM(RTRIM(TRIM("contactId"), '+'), '+');
-- 2. contacts.contactId (comment out if table does not exist)
UPDATE contacts
SET "contactId" = LTRIM(RTRIM(TRIM("contactId"), '+'), '+')
WHERE "contactId" <> LTRIM(RTRIM(TRIM("contactId"), '+'), '+');
COMMIT;