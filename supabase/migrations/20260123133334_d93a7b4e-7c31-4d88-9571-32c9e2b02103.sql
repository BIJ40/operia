-- Phase 1: Support vers Kanban - Nouvelles colonnes et table d'échanges

-- 1.1 Ajouter les 2 nouvelles colonnes de statut Kanban
INSERT INTO apogee_ticket_statuses (id, label, display_order, color, is_final)
VALUES 
  ('USER', 'DEMANDE USER', -1, '#ef4444', false),
  ('SUPPORT_RESOLU', 'SUPPORT RÉSOLU', 99, '#10b981', true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  display_order = EXCLUDED.display_order,
  color = EXCLUDED.color,
  is_final = EXCLUDED.is_final;

-- 1.2 Ajouter les champs sur apogee_tickets pour le support
ALTER TABLE apogee_tickets 
  ADD COLUMN IF NOT EXISTS initiator_profile JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_urgent_support BOOLEAN DEFAULT false;

-- Commentaires pour documentation
COMMENT ON COLUMN apogee_tickets.initiator_profile IS 'Profil du demandeur: {first_name, last_name, email, phone, agence}';
COMMENT ON COLUMN apogee_tickets.is_urgent_support IS 'True si ticket créé via support non résolu - déclenche clignotement rouge';

-- 1.3 Créer table d'échanges support ↔ utilisateur
CREATE TABLE IF NOT EXISTS apogee_ticket_support_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES apogee_tickets(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  is_from_support BOOLEAN NOT NULL DEFAULT true,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_exchanges_ticket ON apogee_ticket_support_exchanges(ticket_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_unread ON apogee_ticket_support_exchanges(ticket_id) 
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_sender ON apogee_ticket_support_exchanges(sender_user_id);

-- Commentaires
COMMENT ON TABLE apogee_ticket_support_exchanges IS 'Échanges bidirectionnels entre équipe support et utilisateur initiateur du ticket';
COMMENT ON COLUMN apogee_ticket_support_exchanges.is_from_support IS 'True = message du support, False = message de l utilisateur';

-- 1.4 RLS pour apogee_ticket_support_exchanges
ALTER TABLE apogee_ticket_support_exchanges ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : support peut tout voir, utilisateur voit ses tickets
CREATE POLICY "exchanges_select_policy" ON apogee_ticket_support_exchanges
FOR SELECT USING (
  -- L'expéditeur peut voir ses messages
  sender_user_id = auth.uid()
  OR
  -- L'initiateur du ticket peut voir les échanges
  EXISTS (
    SELECT 1 FROM apogee_tickets t 
    WHERE t.id = ticket_id AND t.support_initiator_user_id = auth.uid()
  )
  OR
  -- L'équipe support/admin peut voir tous les échanges
  has_min_global_role(auth.uid(), 3)
  OR
  -- Les utilisateurs avec accès apogee_tickets peuvent voir
  has_apogee_tickets_access(auth.uid())
);

-- Politique INSERT : support ou initiateur peuvent envoyer
CREATE POLICY "exchanges_insert_policy" ON apogee_ticket_support_exchanges
FOR INSERT WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    -- Soit c'est l'initiateur du ticket
    EXISTS (
      SELECT 1 FROM apogee_tickets t 
      WHERE t.id = ticket_id AND t.support_initiator_user_id = auth.uid()
    )
    OR
    -- Soit c'est le support/admin
    has_min_global_role(auth.uid(), 3)
    OR
    has_apogee_tickets_access(auth.uid())
  )
);

-- Politique UPDATE : pour marquer comme lu
CREATE POLICY "exchanges_update_policy" ON apogee_ticket_support_exchanges
FOR UPDATE USING (
  -- L'initiateur peut marquer comme lu les messages du support
  EXISTS (
    SELECT 1 FROM apogee_tickets t 
    WHERE t.id = ticket_id AND t.support_initiator_user_id = auth.uid()
  )
  OR
  -- Le support peut marquer comme lu les messages de l'utilisateur
  (has_min_global_role(auth.uid(), 3) OR has_apogee_tickets_access(auth.uid()))
);

-- 1.5 Ajouter 'AGENCE' comme reported_by possible (dans apogee_reported_by si existe)
INSERT INTO apogee_reported_by (id, label, display_order, color)
VALUES ('AGENCE', 'Agence (Support)', 10, '#6366f1')
ON CONFLICT (id) DO NOTHING;

-- 1.6 Activer realtime pour les échanges
ALTER PUBLICATION supabase_realtime ADD TABLE apogee_ticket_support_exchanges;