-- Ajouter un champ pour tracker quand un ticket a été vu par le support
ALTER TABLE public.support_tickets
ADD COLUMN viewed_by_support_at timestamptz NULL;

-- Index pour améliorer les performances des requêtes
CREATE INDEX idx_support_tickets_viewed_by_support 
ON public.support_tickets(viewed_by_support_at) 
WHERE viewed_by_support_at IS NULL;