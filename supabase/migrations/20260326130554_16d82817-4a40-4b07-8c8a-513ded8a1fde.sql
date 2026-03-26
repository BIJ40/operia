
-- Table des échanges apporteur/agence sur un dossier
CREATE TABLE public.dossier_exchanges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  dossier_ref TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('apporteur', 'agence')),
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('annuler', 'relancer', 'info', 'reponse')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour requêtes par dossier
CREATE INDEX idx_dossier_exchanges_ref ON public.dossier_exchanges(dossier_ref, created_at DESC);
CREATE INDEX idx_dossier_exchanges_agency ON public.dossier_exchanges(agency_id);

-- RLS
ALTER TABLE public.dossier_exchanges ENABLE ROW LEVEL SECURITY;

-- Les apporteurs authentifiés peuvent lire les échanges de leurs dossiers (via edge function)
-- L'insertion se fait via edge function avec service_role
CREATE POLICY "Service role full access on dossier_exchanges"
  ON public.dossier_exchanges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lecture publique pour les fonctions edge (anon avec JWT vérifié dans la fonction)
CREATE POLICY "Authenticated read on dossier_exchanges"
  ON public.dossier_exchanges
  FOR SELECT
  TO authenticated
  USING (true);
