-- P1-5: Drop duplicate table sensitive_data_access_log (singular) 
-- The canonical table is sensitive_data_access_logs (plural, used by RPC get_collaborator_sensitive_data)
DROP TABLE IF EXISTS sensitive_data_access_log;

-- P1-6: Create indexes on top 10 FK columns for JOIN/CASCADE performance
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_created_by ON apogee_tickets (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_module ON apogee_tickets (module);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_kanban_status ON apogee_tickets (kanban_status);
CREATE INDEX IF NOT EXISTS idx_apogee_ticket_comments_ticket_id ON apogee_ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_apogee_ticket_history_ticket_id ON apogee_ticket_history (ticket_id);
CREATE INDEX IF NOT EXISTS idx_apogee_ticket_attachments_ticket_id ON apogee_ticket_attachments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_agency_id ON activity_log (agency_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON activity_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_agency_id ON collaborators (agency_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators (user_id);