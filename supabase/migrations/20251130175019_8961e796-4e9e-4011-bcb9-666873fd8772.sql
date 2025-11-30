-- P3#2: Ajout colonnes IA pour auto-catégorisation des tickets support

-- Colonnes pour stockage résultats IA
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS ai_category TEXT,
ADD COLUMN IF NOT EXISTS ai_priority TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS ai_suggested_answer TEXT,
ADD COLUMN IF NOT EXISTS ai_is_incomplete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_tags TEXT[],
ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_classified_at TIMESTAMP WITH TIME ZONE;

-- Index pour monitoring et filtrage
CREATE INDEX IF NOT EXISTS idx_support_tickets_auto_classified ON public.support_tickets(auto_classified);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ai_incomplete ON public.support_tickets(ai_is_incomplete) WHERE ai_is_incomplete = true;
CREATE INDEX IF NOT EXISTS idx_support_tickets_ai_category ON public.support_tickets(ai_category);

-- Commentaires descriptifs
COMMENT ON COLUMN public.support_tickets.ai_category IS 'Catégorie suggérée par l''IA (bug, question, blocage, etc.)';
COMMENT ON COLUMN public.support_tickets.ai_priority IS 'Priorité suggérée par l''IA (bloquant, urgent, important, normal)';
COMMENT ON COLUMN public.support_tickets.ai_confidence IS 'Score de confiance IA (0-1)';
COMMENT ON COLUMN public.support_tickets.ai_suggested_answer IS 'Réponse suggérée par l''IA basée sur FAQ/RAG';
COMMENT ON COLUMN public.support_tickets.ai_is_incomplete IS 'Ticket détecté comme incomplet par l''IA';
COMMENT ON COLUMN public.support_tickets.ai_tags IS 'Tags IA pour classification (planning, facturation, apogee, etc.)';
COMMENT ON COLUMN public.support_tickets.auto_classified IS 'True si le ticket a été classifié automatiquement';
COMMENT ON COLUMN public.support_tickets.ai_classified_at IS 'Timestamp de la dernière classification IA';