-- =============================================================================
-- MIGRATE MESSAGES TO CONTACT-BASED DESIGN
-- =============================================================================
-- 
-- This migration:
-- 1. Adds contactId column to messages (primary relationship)
-- 2. Backfills contactId from existing sessions
-- 3. Changes sessionId foreign key from CASCADE to SET NULL
--
-- Run this BEFORE deploying the updated code.
-- =============================================================================

-- Step 1: Add contactId column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "contactId" VARCHAR(50);

-- Step 2: Create index for efficient queries by contact
CREATE INDEX IF NOT EXISTS idx_messages_contact_created 
ON messages("contactId", "createdAt" DESC);

-- Step 3: Backfill contactId from sessions
UPDATE messages m
SET "contactId" = s."contactId"
FROM inbox_sessions s
WHERE m."sessionId" = s.id 
  AND m."contactId" IS NULL;

-- Step 4: Drop the old CASCADE constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS "FK_066163c46cda7e8187f96bc87a0";

-- Step 5: Add new SET NULL constraint
ALTER TABLE messages 
  ADD CONSTRAINT "FK_messages_session" 
  FOREIGN KEY ("sessionId") 
  REFERENCES inbox_sessions(id) 
  ON DELETE SET NULL;

-- Step 6: Make sessionId nullable (for orphaned messages)
ALTER TABLE messages ALTER COLUMN "sessionId" DROP NOT NULL;

-- Verify
SELECT 'Messages with contactId:' as info, COUNT(*) FROM messages WHERE "contactId" IS NOT NULL;
SELECT 'Messages without contactId:' as info, COUNT(*) FROM messages WHERE "contactId" IS NULL;
SELECT 'Migration complete!' as status;
