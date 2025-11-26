-- Phase 1: Ajout des nouveaux champs pour la réorganisation Support/Tickets

-- Ajouter le statut 'unresolved' pour les tickets non résolus
-- Note: support_tickets.status utilise 'text' type, donc pas besoin de modifier l'enum

-- Ajouter les nouveaux champs booléens
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS is_live_chat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_from_chat boolean DEFAULT false;

-- Commenter les colonnes pour la documentation
COMMENT ON COLUMN support_tickets.is_live_chat IS 'Indique si cette demande est un chat en cours (support direct)';
COMMENT ON COLUMN support_tickets.escalated_from_chat IS 'Indique si ce ticket provient d''une escalade depuis le chat';