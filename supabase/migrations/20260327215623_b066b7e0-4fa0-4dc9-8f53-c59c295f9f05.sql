-- Update the payments view to prefer the stored client_name column
CREATE OR REPLACE VIEW public.payments_clients_suivi_with_client
WITH (security_invoker = on) AS
SELECT
  p.*,
  COALESCE(
    p.client_name,
    NULLIF(TRIM(CONCAT(cm.raw_data->>'prenom', ' ', cm.raw_data->>'nom')), '')
  ) AS resolved_client_name
FROM payments_clients_suivi p
LEFT JOIN apogee_agencies aa ON aa.slug = p.agency_slug
LEFT JOIN projects_mirror pm ON pm.ref = p.ref_dossier AND pm.agency_id = aa.id
LEFT JOIN clients_mirror cm ON cm.apogee_id = pm.raw_data->>'clientId' AND cm.agency_id = aa.id;

-- Backfill existing payments from mirror where possible
UPDATE payments_clients_suivi p
SET client_name = TRIM(CONCAT(cm.raw_data->>'prenom', ' ', cm.raw_data->>'nom'))
FROM apogee_agencies aa
JOIN projects_mirror pm ON pm.agency_id = aa.id
JOIN clients_mirror cm ON cm.apogee_id = pm.raw_data->>'clientId' AND cm.agency_id = aa.id
WHERE aa.slug = p.agency_slug
  AND pm.ref = p.ref_dossier
  AND p.client_name IS NULL
  AND TRIM(CONCAT(cm.raw_data->>'prenom', ' ', cm.raw_data->>'nom')) != '';