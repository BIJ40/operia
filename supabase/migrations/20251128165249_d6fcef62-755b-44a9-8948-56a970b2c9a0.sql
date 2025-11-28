-- ============================================
-- PHASE 1: Migration DB pour module SUPPORT
-- ============================================

-- 1.1. Mise à jour du statut des tickets
-- Remapper 'waiting' vers 'waiting_user' pour homogénéiser
UPDATE public.support_tickets 
SET status = 'waiting_user' 
WHERE status = 'waiting';

-- Pas besoin de contrainte enum, on garde text avec les valeurs:
-- new, in_progress, waiting_user, resolved, closed

-- Mettre à jour les tickets sans statut explicite vers 'new'
UPDATE public.support_tickets 
SET status = 'new' 
WHERE status IS NULL OR status = '';

-- 1.2. Mise à jour des priorités
-- Les valeurs existantes (normal, urgent) restent valides
-- Nouvelles valeurs: mineur, normal, important, urgent, bloquant
-- Pas de migration nécessaire car normal et urgent sont conservés

-- 1.3. Ajouter le champ is_internal_note à support_messages
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS is_internal_note boolean DEFAULT false;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN public.support_messages.is_internal_note IS 
'true = note interne visible uniquement par les Support Users, false = message visible par l utilisateur final';

-- 1.4. Ajouter un index pour optimiser les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_service ON public.support_tickets(service);
CREATE INDEX IF NOT EXISTS idx_support_tickets_support_level ON public.support_tickets(support_level);

-- 1.5. S'assurer que support_level existe sur support_tickets (pour l'escalade)
-- Il existe déjà selon le schéma, mais vérifions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'support_tickets' 
        AND column_name = 'support_level'
    ) THEN
        ALTER TABLE public.support_tickets ADD COLUMN support_level integer DEFAULT 1;
    END IF;
END $$;

-- 1.6. Mettre à jour les tickets existants pour avoir support_level = 1 par défaut
UPDATE public.support_tickets 
SET support_level = 1 
WHERE support_level IS NULL;