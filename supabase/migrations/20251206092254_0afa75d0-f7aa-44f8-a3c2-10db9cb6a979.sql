-- Table pour stocker les confirmations/infirmations SAV et les coûts
CREATE TABLE public.sav_dossier_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id INTEGER NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  
  -- Confirmation SAV: true = confirmé, false = infirmé, null = pas de décision
  is_confirmed_sav BOOLEAN NULL,
  
  -- Coût SAV manuel (en euros)
  cout_sav_manuel NUMERIC(12, 2) NULL,
  
  -- Métadonnées
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Un seul override par projet par agence
  UNIQUE(project_id, agency_id)
);

-- Activer RLS
ALTER TABLE public.sav_dossier_overrides ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs peuvent voir les overrides de leur agence
CREATE POLICY "Users can view their agency SAV overrides"
ON public.sav_dossier_overrides
FOR SELECT
USING (
  agency_id IN (
    SELECT aa.id FROM apogee_agencies aa
    JOIN profiles p ON aa.slug = p.agence
    WHERE p.id = auth.uid()
  )
);

-- Politique: les utilisateurs avec global_role N2+ peuvent modifier
CREATE POLICY "N2+ users can manage their agency SAV overrides"
ON public.sav_dossier_overrides
FOR ALL
USING (
  agency_id IN (
    SELECT aa.id FROM apogee_agencies aa
    JOIN profiles p ON aa.slug = p.agence
    WHERE p.id = auth.uid()
    AND p.global_role IN ('franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
  )
)
WITH CHECK (
  agency_id IN (
    SELECT aa.id FROM apogee_agencies aa
    JOIN profiles p ON aa.slug = p.agence
    WHERE p.id = auth.uid()
    AND p.global_role IN ('franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
  )
);

-- Trigger pour update timestamp
CREATE TRIGGER update_sav_dossier_overrides_updated_at
BEFORE UPDATE ON public.sav_dossier_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour performances
CREATE INDEX idx_sav_dossier_overrides_project ON public.sav_dossier_overrides(project_id);
CREATE INDEX idx_sav_dossier_overrides_agency ON public.sav_dossier_overrides(agency_id);

-- Commentaires
COMMENT ON TABLE public.sav_dossier_overrides IS 'Stocke les confirmations SAV et coûts manuels par dossier';
COMMENT ON COLUMN public.sav_dossier_overrides.is_confirmed_sav IS 'true=confirmé SAV, false=infirmé SAV, null=auto-détecté';
COMMENT ON COLUMN public.sav_dossier_overrides.cout_sav_manuel IS 'Coût SAV manuel en euros (remplace le calcul auto)';