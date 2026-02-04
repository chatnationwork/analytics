-- =============================================================================
-- BACKFILL MESSAGES FROM EVENTS
-- =============================================================================
-- 
-- This script syncs historical message events from the events table to the
-- messages table. Run this once after deploying the event name standardization fix.
--
-- It creates inbox sessions and messages for any message.received/message.sent
-- events that don't already have corresponding messages.
-- =============================================================================

-- Step 1: Insert missing messages from events
-- We join with inbox_sessions to get the sessionId, creating sessions if needed

DO $$
DECLARE
    event_record RECORD;
    session_id UUID;
    normalized_contact_id TEXT;
    msg_exists BOOLEAN;
BEGIN
    -- Loop through all message events that might not have been synced
    FOR event_record IN 
        SELECT 
            e."eventId",
            e."tenantId",
            e."eventName",
            e."externalId",
            e.timestamp,
            e.properties,
            e."messageId"
        FROM events e
        WHERE e."eventName" IN ('message.received', 'message.sent')
          AND e."externalId" IS NOT NULL
          AND e."externalId" != ''
        ORDER BY e.timestamp ASC
    LOOP
        -- Normalize contact ID (digits only)
        normalized_contact_id := regexp_replace(event_record."externalId", '\D', '', 'g');
        
        -- Skip if contact ID is empty after normalization
        IF normalized_contact_id = '' THEN
            CONTINUE;
        END IF;
        
        -- Check if message already exists (by eventId stored in externalId or by messageId match)
        SELECT EXISTS (
            SELECT 1 FROM messages m 
            WHERE m."externalId" = event_record."messageId"::text
               OR m."externalId" = event_record."eventId"::text
        ) INTO msg_exists;
        
        IF msg_exists THEN
            CONTINUE;
        END IF;
        
        -- Find or create session
        SELECT id INTO session_id
        FROM inbox_sessions
        WHERE "tenantId" = event_record."tenantId"
          AND "contactId" = normalized_contact_id
        ORDER BY "createdAt" DESC
        LIMIT 1;
        
        -- Create session if not exists
        IF session_id IS NULL THEN
            INSERT INTO inbox_sessions (
                id, 
                "tenantId", 
                "contactId", 
                "contactName",
                channel, 
                status, 
                context,
                "createdAt",
                "updatedAt",
                "lastMessageAt"
            ) VALUES (
                gen_random_uuid(),
                event_record."tenantId",
                normalized_contact_id,
                COALESCE(event_record.properties->>'name', event_record.properties->>'profileName', normalized_contact_id),
                'whatsapp',
                'unassigned',
                '{"source": "backfill"}'::jsonb,
                event_record.timestamp,
                event_record.timestamp,
                event_record.timestamp
            )
            RETURNING id INTO session_id;
        END IF;
        
        -- Extract message content
        -- Insert message
        INSERT INTO messages (
            id,
            "sessionId",
            "tenantId",
            "externalId",
            direction,
            type,
            content,
            metadata,
            "createdAt"
        ) VALUES (
            gen_random_uuid(),
            session_id,
            event_record."tenantId",
            event_record."messageId"::text,
            CASE WHEN event_record."eventName" = 'message.received' THEN 'inbound'::messages_direction_enum ELSE 'outbound'::messages_direction_enum END,
            'text'::messages_type_enum,
            COALESCE(
                event_record.properties->'text'->>'body',
                event_record.properties->>'text',
                event_record.properties->>'content',
                '[Message]'
            ),
            event_record.properties,
            event_record.timestamp
        );

        
        -- Update session lastMessageAt
        UPDATE inbox_sessions 
        SET "lastMessageAt" = GREATEST("lastMessageAt", event_record.timestamp)
        WHERE id = session_id;
        
    END LOOP;
    
    RAISE NOTICE 'Backfill complete!';
END $$;

-- Verify results
SELECT 'Messages after backfill:' as info, COUNT(*) as count FROM messages;
SELECT 'Events with messages:' as info, COUNT(*) as count FROM events WHERE "eventName" IN ('message.received', 'message.sent');
