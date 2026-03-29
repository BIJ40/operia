-- Ticketing: not a core module, it's per-user assignment only
UPDATE module_catalog
SET is_core = false
WHERE key = 'ticketing';

UPDATE module_distribution_rules
SET via_user_assignment = true,
    via_plan = false,
    assignable_by_scope = 'both'
WHERE module_key = 'ticketing';