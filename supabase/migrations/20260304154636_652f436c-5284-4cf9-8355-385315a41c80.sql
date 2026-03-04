
-- Fix tickets with reported_by = 'AGENCE' created via support chat
-- These have support_initiator_user_id set, so we can look up the profile
UPDATE apogee_tickets t
SET reported_by = UPPER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')))
FROM profiles p
WHERE t.reported_by = 'AGENCE'
  AND t.support_initiator_user_id IS NOT NULL
  AND p.id = t.support_initiator_user_id
  AND (p.first_name IS NOT NULL OR p.last_name IS NOT NULL);

-- Fix tickets with reported_by = 'AUTRE' created via email
-- Try to match using initiator_profile email against profiles
UPDATE apogee_tickets t
SET 
  reported_by = UPPER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))),
  support_initiator_user_id = p.id
FROM profiles p
WHERE t.reported_by = 'AUTRE'
  AND t.created_from = 'email'
  AND t.initiator_profile IS NOT NULL
  AND LOWER(t.initiator_profile->>'email') = LOWER(p.email)
  AND (p.first_name IS NOT NULL OR p.last_name IS NOT NULL);

-- For remaining email tickets with AUTRE where no profile match found,
-- use the email from initiator_profile as reported_by
UPDATE apogee_tickets t
SET reported_by = LOWER(t.initiator_profile->>'email')
WHERE t.reported_by = 'AUTRE'
  AND t.created_from = 'email'
  AND t.initiator_profile IS NOT NULL
  AND t.initiator_profile->>'email' IS NOT NULL
  AND t.initiator_profile->>'email' != '';
