-- Table pour persister les validations des métriques StatIA
CREATE TABLE public.statia_metric_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id TEXT NOT NULL UNIQUE,
  validated BOOLEAN NOT NULL DEFAULT false,
  hidden BOOLEAN NOT NULL DEFAULT false,
  suggestion TEXT,
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_statia_metric_validations_metric_id ON public.statia_metric_validations(metric_id);

-- Trigger pour updated_at
CREATE TRIGGER update_statia_metric_validations_updated_at
  BEFORE UPDATE ON public.statia_metric_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.statia_metric_validations ENABLE ROW LEVEL SECURITY;

-- Admins N5+ peuvent tout gérer
CREATE POLICY "Admins can manage metric validations"
  ON public.statia_metric_validations
  FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Authenticated users can view metric validations"
  ON public.statia_metric_validations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);