-- Indexes pour optimiser les requêtes maintenance (CRON + UI)

-- Index composite sur maintenance_events pour le scan CRON
CREATE INDEX IF NOT EXISTS idx_maintenance_events_status_scheduled_at
  ON maintenance_events (status, scheduled_at);

-- Index agence sur maintenance_events
CREATE INDEX IF NOT EXISTS idx_maintenance_events_agency
  ON maintenance_events (agency_id);

-- Index composite sur maintenance_alerts pour vérifier les alertes existantes
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_event_status
  ON maintenance_alerts (maintenance_event_id, status);

-- Index agence sur maintenance_alerts
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_agency
  ON maintenance_alerts (agency_id);