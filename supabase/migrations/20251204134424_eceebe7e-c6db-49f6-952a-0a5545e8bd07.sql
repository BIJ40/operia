-- Table de stockage des métriques custom StatIA
CREATE TABLE public.statia_custom_metrics (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  scope TEXT NOT NULL CHECK (scope IN ('global', 'agency')),
  agency_slug TEXT,
  definition_json JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Contrainte: agency_slug obligatoire si scope='agency'
  CONSTRAINT agency_slug_required_for_agency_scope 
    CHECK (scope = 'global' OR (scope = 'agency' AND agency_slug IS NOT NULL))
);

-- Indexes pour performance
CREATE INDEX idx_statia_custom_metrics_scope ON public.statia_custom_metrics(scope);
CREATE INDEX idx_statia_custom_metrics_agency ON public.statia_custom_metrics(agency_slug) WHERE agency_slug IS NOT NULL;
CREATE INDEX idx_statia_custom_metrics_active ON public.statia_custom_metrics(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.statia_custom_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: N5/N6 (platform_admin, superadmin) peuvent tout voir et gérer
CREATE POLICY "statia_metrics_admin_all"
ON public.statia_custom_metrics
FOR ALL
USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Policy: N2+ peuvent voir les métriques globales
CREATE POLICY "statia_metrics_global_select"
ON public.statia_custom_metrics
FOR SELECT
USING (
  scope = 'global' 
  AND is_active = true 
  AND has_min_global_role(auth.uid(), 2)
);

-- Policy: N2+ peuvent voir les métriques de leur agence
CREATE POLICY "statia_metrics_agency_select"
ON public.statia_custom_metrics
FOR SELECT
USING (
  scope = 'agency' 
  AND is_active = true 
  AND agency_slug = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
  AND has_min_global_role(auth.uid(), 2)
);

-- Policy: N2+ peuvent créer/modifier des métriques pour leur agence
CREATE POLICY "statia_metrics_agency_insert"
ON public.statia_custom_metrics
FOR INSERT
WITH CHECK (
  scope = 'agency'
  AND agency_slug = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
  AND has_min_global_role(auth.uid(), 2)
);

CREATE POLICY "statia_metrics_agency_update"
ON public.statia_custom_metrics
FOR UPDATE
USING (
  scope = 'agency'
  AND agency_slug = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
  AND has_min_global_role(auth.uid(), 2)
);

-- Trigger pour updated_at
CREATE TRIGGER set_statia_custom_metrics_updated_at
BEFORE UPDATE ON public.statia_custom_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();