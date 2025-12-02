-- Table centralisée des définitions de métriques STATiA-BY-BIJ
CREATE TABLE public.metrics_definitions (
  id TEXT PRIMARY KEY, -- clé stable ex: 'ca_mensuel', 'avg_intervention_duration'
  label TEXT NOT NULL,
  description_agence TEXT, -- explication pour dirigeants d'agence
  description_franchiseur TEXT, -- vision réseau
  scope TEXT NOT NULL CHECK (scope IN ('agency', 'franchiseur', 'apporteur', 'tech', 'mix')),
  
  -- Configuration des sources de données (endpoints Apogée)
  input_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{ "source": "interventions", "filters": {...}, "join_on": "project_id" }]
  
  -- Formule de calcul en JSON DSL
  formula JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: { "type": "avg|sum|count|ratio|distinct", "field": "...", "groupBy": [...], "filters": [...] }
  
  -- Métadonnées de routage compute
  compute_hint TEXT DEFAULT 'auto' CHECK (compute_hint IN ('auto', 'frontend', 'edge')),
  -- auto = le moteur décide selon complexité
  
  validation_status TEXT NOT NULL DEFAULT 'draft' CHECK (validation_status IN ('draft', 'test', 'validated')),
  visibility JSONB DEFAULT '["agency"]'::jsonb, -- où la métrique est consommable
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Cache config optionnel
  cache_ttl_seconds INTEGER DEFAULT 300 -- 5 min par défaut
);

-- Index pour recherche rapide
CREATE INDEX idx_metrics_definitions_scope ON public.metrics_definitions(scope);
CREATE INDEX idx_metrics_definitions_status ON public.metrics_definitions(validation_status);

-- Trigger updated_at
CREATE TRIGGER update_metrics_definitions_updated_at
  BEFORE UPDATE ON public.metrics_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.metrics_definitions ENABLE ROW LEVEL SECURITY;

-- Lecture: admins + franchiseurs avancés
CREATE POLICY "Admins and franchisors can read metrics"
  ON public.metrics_definitions
  FOR SELECT
  USING (has_min_global_role(auth.uid(), 3));

-- Écriture: admins uniquement
CREATE POLICY "Only admins can manage metrics"
  ON public.metrics_definitions
  FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Table de cache des résultats calculés (optionnel mais utile pour les métriques lourdes)
CREATE TABLE public.metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id TEXT NOT NULL REFERENCES public.metrics_definitions(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL, -- hash des params (agency_id, date_range, etc.)
  result JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(metric_id, cache_key)
);

CREATE INDEX idx_metrics_cache_lookup ON public.metrics_cache(metric_id, cache_key);
CREATE INDEX idx_metrics_cache_expiry ON public.metrics_cache(expires_at);

-- RLS cache
ALTER TABLE public.metrics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache readable by authenticated"
  ON public.metrics_cache
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Cache writable by system"
  ON public.metrics_cache
  FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));