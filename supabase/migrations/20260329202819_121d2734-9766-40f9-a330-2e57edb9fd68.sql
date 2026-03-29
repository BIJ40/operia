-- Add granular guide sub-modules under support.guides
-- First, change support.guides from 'screen' to 'section' so it can have children
UPDATE module_catalog SET node_type = 'section' WHERE key = 'support.guides';

-- Insert the 3 guide sub-modules
INSERT INTO module_catalog (key, parent_key, label, node_type, is_deployed, is_core, is_delegatable, sort_order, category)
VALUES
  ('support.guides.apogee', 'support.guides', 'Guide Apogée', 'screen', true, true, true, 21, NULL),
  ('support.guides.apporteurs', 'support.guides', 'Guide Apporteurs', 'screen', true, true, true, 22, NULL),
  ('support.guides.helpconfort', 'support.guides', 'Guide HelpConfort', 'screen', true, true, true, 23, NULL)
ON CONFLICT (key) DO NOTHING;

-- Grant these to all users who already have support.guides access
-- by inserting into user_access for all existing users with support.guides
-- Actually, since they're is_core=true, the RPC should auto-grant them via bypass/socle
