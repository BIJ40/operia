INSERT INTO user_access (user_id, module_key, granted, access_level, source, granted_at)
SELECT p.id, 'organisation.salaries', true, 'full', 'agency_delegation', now()
FROM profiles p
WHERE p.email = 'aaaaaa@aaaaaa.aaaaaa'
ON CONFLICT (user_id, module_key) DO NOTHING;