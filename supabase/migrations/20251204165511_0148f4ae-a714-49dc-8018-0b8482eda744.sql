-- Table pour les métriques personnalisées StatIA
CREATE TABLE IF NOT EXISTS public.statia_custom_metrics (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  scope TEXT NOT NULL CHECK (scope IN ('global', 'agency')),
  agency_slug TEXT,
  definition_json JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_statia_custom_metrics_scope ON public.statia_custom_metrics(scope);
CREATE INDEX IF NOT EXISTS idx_statia_custom_metrics_agency ON public.statia_custom_metrics(agency_slug);
CREATE INDEX IF NOT EXISTS idx_statia_custom_metrics_created_by ON public.statia_custom_metrics(created_by);
CREATE INDEX IF NOT EXISTS idx_statia_custom_metrics_active ON public.statia_custom_metrics(is_active);

-- Enable RLS
ALTER TABLE public.statia_custom_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Voir les métriques globales + ses propres métriques agence
CREATE POLICY "statia_custom_metrics_select" ON public.statia_custom_metrics
FOR SELECT USING (
  -- Admins voient tout
  has_min_global_role(auth.uid(), 5)
  OR
  -- Métriques globales visibles par tous les authentifiés
  scope = 'global'
  OR
  -- Métriques agence visibles par l'agence
  (scope = 'agency' AND agency_slug = get_user_agency(auth.uid()))
);

-- INSERT: N5+ pour global, N2+ pour leur agence
CREATE POLICY "statia_custom_metrics_insert" ON public.statia_custom_metrics
FOR INSERT WITH CHECK (
  -- N5+ peut créer des métriques globales
  (scope = 'global' AND has_min_global_role(auth.uid(), 5))
  OR
  -- N2+ peut créer des métriques pour son agence
  (scope = 'agency' AND agency_slug = get_user_agency(auth.uid()) AND has_min_global_role(auth.uid(), 2))
);

-- UPDATE: Créateur ou admin
CREATE POLICY "statia_custom_metrics_update" ON public.statia_custom_metrics
FOR UPDATE USING (
  has_min_global_role(auth.uid(), 5)
  OR
  created_by = auth.uid()
);

-- DELETE: Admin uniquement
CREATE POLICY "statia_custom_metrics_delete" ON public.statia_custom_metrics
FOR DELETE USING (
  has_min_global_role(auth.uid(), 5)
);

-- Trigger updated_at
CREATE TRIGGER update_statia_custom_metrics_updated_at
  BEFORE UPDATE ON public.statia_custom_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();