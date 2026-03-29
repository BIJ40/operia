-- Backfill ticketing manquants dans user_access
INSERT INTO user_access (user_id, module_key, granted, access_level, source, granted_at)
SELECT um.user_id, 'ticketing', true, 'full', 'platform_assignment', now()
FROM user_modules um
WHERE um.module_key = 'ticketing'
  AND NOT EXISTS (
    SELECT 1 FROM user_access ua 
    WHERE ua.user_id = um.user_id AND ua.module_key = 'ticketing'
  )
ON CONFLICT (user_id, module_key) DO NOTHING;

-- Backfill modules manquants pour aaaaaa (remapping V1 → V2)
INSERT INTO user_access (user_id, module_key, granted, access_level, source, granted_at)
SELECT um.user_id,
  CASE um.module_key
    WHEN 'agence' THEN 'pilotage.statistiques'
    WHEN 'rh'     THEN 'organisation.salaries'
    ELSE um.module_key
  END,
  true, 'full', 'agency_delegation', now()
FROM user_modules um
WHERE um.user_id = (SELECT id FROM profiles WHERE email = 'aaaaaa@aaaaaa.aaaaaa')
  AND um.module_key IN ('agence', 'rh', 'organisation.salaries', 'pilotage.statistiques')
  AND NOT EXISTS (
    SELECT 1 FROM user_access ua 
    WHERE ua.user_id = um.user_id 
    AND ua.module_key = CASE um.module_key
      WHEN 'agence' THEN 'pilotage.statistiques'
      WHEN 'rh'     THEN 'organisation.salaries'
      ELSE um.module_key
    END
  )
ON CONFLICT (user_id, module_key) DO NOTHING;