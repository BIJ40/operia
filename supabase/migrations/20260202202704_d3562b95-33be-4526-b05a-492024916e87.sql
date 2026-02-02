-- Table pour stocker les validations/invalidations de SAV
CREATE TABLE public.sav_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  intervention_id TEXT NOT NULL,
  is_valid_sav BOOLEAN NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_by UUID REFERENCES auth.users(id),
  validated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT sav_validations_unique UNIQUE (agency_id, intervention_id)
);

-- Index pour recherche rapide
CREATE INDEX idx_sav_validations_agency ON public.sav_validations(agency_id);
CREATE INDEX idx_sav_validations_intervention ON public.sav_validations(intervention_id);

-- RLS
ALTER TABLE public.sav_validations ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs de l'agence peuvent voir les validations de leur agence
CREATE POLICY "Users can view their agency SAV validations"
ON public.sav_validations
FOR SELECT
USING (
  agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Politique: les utilisateurs N2+ peuvent créer/modifier les validations de leur agence
CREATE POLICY "Admins can manage their agency SAV validations"
ON public.sav_validations
FOR ALL
USING (
  agency_id IN (
    SELECT p.agency_id FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.global_role IN ('franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin')
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_sav_validations_updated_at
BEFORE UPDATE ON public.sav_validations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();