INSERT INTO apogee_ticket_statuses (id, label, color, display_order, is_final)
VALUES ('IA_ESCALADE', 'ESCALADE IA', '#f97316', 15, false)
ON CONFLICT (id) DO NOTHING;