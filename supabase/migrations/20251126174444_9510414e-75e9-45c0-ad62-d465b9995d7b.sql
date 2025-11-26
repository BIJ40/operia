-- Add support levels to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS support_level INTEGER DEFAULT 1 CHECK (support_level >= 1 AND support_level <= 3);

-- Add support level tracking to tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS support_level INTEGER DEFAULT 1 CHECK (support_level >= 1 AND support_level <= 3);

-- Add escalation history to track level changes
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalation_history JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.support_level IS 'Support tier: 1=basic help, 2=technical, 3=developer';
COMMENT ON COLUMN support_tickets.support_level IS 'Current support level required for this ticket';
COMMENT ON COLUMN support_tickets.escalation_history IS 'History of level escalations with timestamps and reasons';