-- Only Guide Apogée stays is_core (always granted)
-- Apporteurs and HelpConfort become optional (assignable/deniable)
UPDATE module_catalog SET is_core = false WHERE key IN ('support.guides.apporteurs', 'support.guides.helpconfort');