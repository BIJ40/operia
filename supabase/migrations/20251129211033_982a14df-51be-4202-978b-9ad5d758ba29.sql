-- Nouveaux champs pour la qualification IA des tickets Apogée
ALTER TABLE public.apogee_tickets
ADD COLUMN IF NOT EXISTS theme TEXT,
ADD COLUMN IF NOT EXISTS ticket_type TEXT,
ADD COLUMN IF NOT EXISTS impact_tags TEXT[],
ADD COLUMN IF NOT EXISTS priority_normalized TEXT,
ADD COLUMN IF NOT EXISTS qualif_status TEXT DEFAULT 'a_qualifier',
ADD COLUMN IF NOT EXISTS notes_internes TEXT,
ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qualified_by UUID REFERENCES auth.users(id);

-- Index pour les filtres courants
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_theme ON public.apogee_tickets(theme);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_ticket_type ON public.apogee_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_is_qualified ON public.apogee_tickets(is_qualified);
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_qualif_status ON public.apogee_tickets(qualif_status);