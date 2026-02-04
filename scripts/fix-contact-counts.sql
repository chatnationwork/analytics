-- =============================================================================
-- FIX: Recalculate message counts for all contacts
-- =============================================================================

UPDATE contacts c
SET "messageCount" = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m."contactId" = c."contactId"
      AND m."tenantId" = c."tenantId"
);

SELECT 'Fixed message counts for ' || COUNT(*) || ' contacts.' as info FROM contacts;
