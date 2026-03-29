-- Fix: support.guides must be accessible to N0 (min_role=0) and sub-modules must be deployed
UPDATE module_catalog SET min_role = 0 WHERE key = 'support.guides';
UPDATE module_catalog SET is_deployed = true WHERE key IN ('support.guides.apporteurs', 'support.guides.helpconfort');