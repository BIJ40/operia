-- Supprimer les doublons en gardant le plus récent
DELETE FROM deadline_alert_acknowledgements a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (user_id, agency_id) id
  FROM deadline_alert_acknowledgements
  ORDER BY user_id, agency_id, acknowledged_on DESC, created_at DESC
);

-- Ajouter contrainte unique pour user_id + agency_id (un seul acquittement par combo)
ALTER TABLE deadline_alert_acknowledgements
ADD CONSTRAINT deadline_alert_ack_user_agency_unique UNIQUE (user_id, agency_id);