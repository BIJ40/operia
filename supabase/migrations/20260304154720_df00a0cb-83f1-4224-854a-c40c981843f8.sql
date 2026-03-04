
-- Fix the remaining AGENCE ticket (812) - has initiator_profile
UPDATE apogee_tickets
SET reported_by = UPPER(TRIM(
  COALESCE(initiator_profile->>'first_name', '') || ' ' || COALESCE(initiator_profile->>'last_name', '')
))
WHERE reported_by = 'AGENCE'
  AND initiator_profile IS NOT NULL
  AND (initiator_profile->>'first_name' IS NOT NULL OR initiator_profile->>'last_name' IS NOT NULL);

-- Fix remaining AUTRE tickets (manual creation, no profile info) - set as Inconnu
-- These were manually created without reported_by being set properly
UPDATE apogee_tickets
SET reported_by = 'INCONNU'
WHERE reported_by = 'AUTRE'
  AND created_from = 'MANUAL'
  AND initiator_profile IS NULL
  AND support_initiator_user_id IS NULL;
