-- SUPPORT_V2 Phase 1: Ajouter colonne is_system_message pour messages système
-- Permet d'identifier les messages automatiques ("Un conseiller a rejoint la conversation", etc.)

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT FALSE;

-- Commentaire pour documentation
COMMENT ON COLUMN public.support_messages.is_system_message IS 'SUPPORT_V2: True pour les messages système automatiques (join, disconnect, etc.)';