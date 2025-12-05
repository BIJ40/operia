-- Table pour tracker les vues de tickets support par utilisateur
CREATE TABLE public.support_ticket_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Index pour performance
CREATE INDEX idx_support_ticket_views_user ON support_ticket_views(user_id);
CREATE INDEX idx_support_ticket_views_ticket ON support_ticket_views(ticket_id);

-- Ajouter colonnes de tracking sur support_tickets
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_by UUID;

-- Index pour le tri par dernière activité
CREATE INDEX idx_support_tickets_last_message ON support_tickets(last_message_at);

-- Trigger pour mettre à jour last_message_at/by quand un message est ajouté
CREATE OR REPLACE FUNCTION update_ticket_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne pas tracker les notes internes ni les messages système
  IF NEW.is_internal_note = true OR NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;
  
  UPDATE support_tickets 
  SET 
    last_message_at = NEW.created_at,
    last_message_by = NEW.sender_id,
    updated_at = now()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_message();

-- RLS pour support_ticket_views
ALTER TABLE support_ticket_views ENABLE ROW LEVEL SECURITY;

-- Utilisateurs peuvent voir/gérer leurs propres vues
CREATE POLICY "Users can manage their own ticket views"
  ON support_ticket_views
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Initialiser last_message_at/by depuis les messages existants
UPDATE support_tickets t
SET 
  last_message_at = sub.max_created_at,
  last_message_by = sub.last_sender
FROM (
  SELECT DISTINCT ON (ticket_id) 
    ticket_id, 
    created_at as max_created_at,
    sender_id as last_sender
  FROM support_messages
  WHERE is_internal_note = false AND is_system_message = false
  ORDER BY ticket_id, created_at DESC
) sub
WHERE t.id = sub.ticket_id;

-- Initialiser toutes les vues comme "lues" pour tous les utilisateurs existants
-- (Les tickets existants sont considérés comme lus par tout le monde)
INSERT INTO support_ticket_views (ticket_id, user_id, viewed_at)
SELECT DISTINCT t.id, p.id, now()
FROM support_tickets t
CROSS JOIN profiles p
WHERE p.global_role IS NOT NULL
ON CONFLICT (ticket_id, user_id) DO NOTHING;