-- View: sms_sent_log enriched with client name from mirror
CREATE OR REPLACE VIEW public.sms_sent_log_with_client
WITH (security_invoker = on) AS
SELECT
  s.*,
  COALESCE(s.client_name,
    NULLIF(TRIM(CONCAT(cm.raw_data->>'prenom', ' ', cm.raw_data->>'nom')), '')
  ) AS resolved_client_name
FROM sms_sent_log s
LEFT JOIN apogee_agencies aa ON aa.slug = s.agency_slug
LEFT JOIN projects_mirror pm ON pm.ref = s.ref_dossier AND pm.agency_id = aa.id
LEFT JOIN clients_mirror cm ON cm.apogee_id = pm.raw_data->>'clientId' AND cm.agency_id = aa.id;

-- View: payments enriched with client name from mirror
CREATE OR REPLACE VIEW public.payments_clients_suivi_with_client
WITH (security_invoker = on) AS
SELECT
  p.*,
  NULLIF(TRIM(CONCAT(cm.raw_data->>'prenom', ' ', cm.raw_data->>'nom')), '') AS client_name
FROM payments_clients_suivi p
LEFT JOIN apogee_agencies aa ON aa.slug = p.agency_slug
LEFT JOIN projects_mirror pm ON pm.ref = p.ref_dossier AND pm.agency_id = aa.id
LEFT JOIN clients_mirror cm ON cm.apogee_id = pm.raw_data->>'clientId' AND cm.agency_id = aa.id;