-- Backfill profiles.agence slug from agency_id where agence is NULL
UPDATE profiles p
SET agence = a.slug
FROM apogee_agencies a
WHERE p.agency_id = a.id
  AND (p.agence IS NULL OR p.agence = '')
  AND a.slug IS NOT NULL;