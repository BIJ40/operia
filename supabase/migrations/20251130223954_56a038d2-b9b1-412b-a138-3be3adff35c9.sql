-- Table des demandes de création d'utilisateur
CREATE TABLE public.user_creation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_agence TEXT NOT NULL DEFAULT 'Assistante',
  target_global_role global_role NOT NULL DEFAULT 'base_user',
  enabled_modules JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

-- Index pour recherche rapide
CREATE INDEX idx_user_creation_requests_status ON public.user_creation_requests(status);
CREATE INDEX idx_user_creation_requests_requested_by ON public.user_creation_requests(requested_by);
CREATE INDEX idx_user_creation_requests_agency_id ON public.user_creation_requests(agency_id);

-- RLS
ALTER TABLE public.user_creation_requests ENABLE ROW LEVEL SECURITY;

-- N3+ peut créer des demandes pour leurs agences assignées
CREATE POLICY "N3 can insert requests for assigned agencies"
ON public.user_creation_requests
FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 2) AND (
    -- Admin peut tout
    has_min_global_role(auth.uid(), 5) OR
    -- N3 peut créer pour ses agences assignées
    (has_min_global_role(auth.uid(), 2) AND agency_id IN (
      SELECT faa.agency_id FROM franchiseur_agency_assignments faa WHERE faa.user_id = auth.uid()
    )) OR
    -- Ou pour sa propre agence
    (agency_id IN (
      SELECT aa.id FROM apogee_agencies aa 
      WHERE aa.slug = (SELECT p.agence FROM profiles p WHERE p.id = auth.uid())
    ))
  )
);

-- N3+ peut voir les demandes de leurs agences
CREATE POLICY "N3 can view their agency requests"
ON public.user_creation_requests
FOR SELECT
USING (
  has_min_global_role(auth.uid(), 5) OR
  requested_by = auth.uid() OR
  agency_id IN (
    SELECT faa.agency_id FROM franchiseur_agency_assignments faa WHERE faa.user_id = auth.uid()
  ) OR
  agency_id IN (
    SELECT aa.id FROM apogee_agencies aa 
    WHERE aa.slug = (SELECT p.agence FROM profiles p WHERE p.id = auth.uid())
  )
);

-- Seuls les admins peuvent approuver/rejeter
CREATE POLICY "Admins can update requests"
ON public.user_creation_requests
FOR UPDATE
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Seuls les admins peuvent supprimer
CREATE POLICY "Admins can delete requests"
ON public.user_creation_requests
FOR DELETE
USING (has_min_global_role(auth.uid(), 5));