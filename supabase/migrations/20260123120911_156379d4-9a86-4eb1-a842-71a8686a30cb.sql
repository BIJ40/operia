-- V3 Support Simplification: Archive and remove Live Support tables
-- Step 1: Archive existing data
CREATE TABLE IF NOT EXISTS live_support_sessions_archive AS 
SELECT * FROM live_support_sessions;

CREATE TABLE IF NOT EXISTS live_support_messages_archive AS 
SELECT * FROM live_support_messages;

-- Step 2: Drop live support tables
DROP TABLE IF EXISTS live_support_messages CASCADE;
DROP TABLE IF EXISTS live_support_sessions CASCADE;

-- Step 3: Normalize ticket types (all become 'ticket')
UPDATE support_tickets 
SET type = 'ticket' 
WHERE type IN ('chat_ai', 'chat_human');