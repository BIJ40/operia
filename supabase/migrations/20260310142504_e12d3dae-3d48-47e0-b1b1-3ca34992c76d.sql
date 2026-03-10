
-- Fix guides min_role: should be 2 (franchisee_admin), not 0
UPDATE module_registry SET min_role = 2 WHERE key = 'guides' AND min_role < 2;
UPDATE module_registry SET min_role = 2 WHERE key LIKE 'guides.%' AND min_role < 2;
