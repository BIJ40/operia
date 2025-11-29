-- Table pour les tags d'impact configurables
CREATE TABLE public.apogee_impact_tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'gray',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apogee_impact_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users with apogee_tickets module can read tags"
  ON public.apogee_impact_tags FOR SELECT
  USING (
    (SELECT ((profiles.enabled_modules->'apogee_tickets'->>'enabled')::boolean) AS bool
     FROM profiles WHERE profiles.id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Admins can manage tags"
  ON public.apogee_impact_tags FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- Insert default tags
INSERT INTO public.apogee_impact_tags (id, label, color, display_order) VALUES
  ('perf', 'Performance', 'orange', 1),
  ('ux', 'UX', 'blue', 2),
  ('data', 'Données', 'purple', 3),
  ('security', 'Sécurité', 'red', 4),
  ('integration', 'Intégration', 'green', 5),
  ('billing', 'Facturation', 'yellow', 6);