-- Ajouter colonne pour lier un ticket Apogée à son ticket support d'origine
ALTER TABLE public.apogee_tickets 
ADD COLUMN IF NOT EXISTS source_support_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- Ajouter colonne pour stocker l'initiateur du support (user_id du ticket support)
ALTER TABLE public.apogee_tickets 
ADD COLUMN IF NOT EXISTS support_initiator_user_id UUID;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_source_support ON public.apogee_tickets(source_support_ticket_id) WHERE source_support_ticket_id IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN public.apogee_tickets.source_support_ticket_id IS 'ID du ticket support d''origine si créé depuis le support';
COMMENT ON COLUMN public.apogee_tickets.support_initiator_user_id IS 'User ID de l''initiateur du ticket support original';