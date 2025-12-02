-- Table pour stocker les embeddings des tickets
CREATE TABLE public.ticket_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.apogee_tickets(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  text_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ticket_id)
);

-- Table pour les suggestions de doublons
CREATE TABLE public.ticket_duplicate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id_source UUID NOT NULL REFERENCES public.apogee_tickets(id) ON DELETE CASCADE,
  ticket_id_candidate UUID NOT NULL REFERENCES public.apogee_tickets(id) ON DELETE CASCADE,
  similarity FLOAT8 NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(ticket_id_source, ticket_id_candidate)
);

-- Ajouter colonne merged_into_ticket_id sur apogee_tickets
ALTER TABLE public.apogee_tickets 
ADD COLUMN IF NOT EXISTS merged_into_ticket_id UUID REFERENCES public.apogee_tickets(id);

-- Activer RLS
ALTER TABLE public.ticket_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_duplicate_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS pour ticket_embeddings (aligné sur apogee_tickets)
CREATE POLICY "Users with apogee_tickets module can read embeddings"
ON public.ticket_embeddings FOR SELECT
USING (
  (SELECT ((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text)::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Users with apogee_tickets module can insert embeddings"
ON public.ticket_embeddings FOR INSERT
WITH CHECK (
  (SELECT ((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text)::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Users with apogee_tickets module can update embeddings"
ON public.ticket_embeddings FOR UPDATE
USING (
  (SELECT ((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text)::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

-- RLS pour ticket_duplicate_suggestions (aligné sur apogee_tickets)
CREATE POLICY "Users with apogee_tickets module can read suggestions"
ON public.ticket_duplicate_suggestions FOR SELECT
USING (
  (SELECT ((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text)::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Users with apogee_tickets module can insert suggestions"
ON public.ticket_duplicate_suggestions FOR INSERT
WITH CHECK (
  (SELECT ((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text)::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

CREATE POLICY "Users with apogee_tickets module can update suggestions"
ON public.ticket_duplicate_suggestions FOR UPDATE
USING (
  (SELECT ((profiles.enabled_modules -> 'apogee_tickets'::text) ->> 'enabled'::text)::boolean
   FROM profiles WHERE profiles.id = auth.uid()) = true
  OR has_min_global_role(auth.uid(), 5)
);

-- Index pour performances
CREATE INDEX idx_ticket_embeddings_ticket_id ON public.ticket_embeddings(ticket_id);
CREATE INDEX idx_duplicate_suggestions_source ON public.ticket_duplicate_suggestions(ticket_id_source);
CREATE INDEX idx_duplicate_suggestions_status ON public.ticket_duplicate_suggestions(status);
CREATE INDEX idx_apogee_tickets_merged_into ON public.apogee_tickets(merged_into_ticket_id) WHERE merged_into_ticket_id IS NOT NULL;