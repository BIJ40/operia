-- Table des widgets StatIA
CREATE TABLE public.statia_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  widget_type TEXT NOT NULL DEFAULT 'kpi', -- 'kpi', 'chart', 'gauge', 'table'
  config JSONB DEFAULT '{}', -- couleur, icône, format, etc.
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_statia_widgets_metric ON statia_widgets(metric_id);
CREATE INDEX idx_statia_widgets_published ON statia_widgets(is_published);

-- Enable RLS
ALTER TABLE public.statia_widgets ENABLE ROW LEVEL SECURITY;

-- Politique: admins peuvent tout faire
CREATE POLICY "Admins can manage widgets" ON public.statia_widgets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.global_role IN ('platform_admin', 'superadmin')
    )
  );

-- Politique: tout le monde peut lire les widgets publiés
CREATE POLICY "Anyone can read published widgets" ON public.statia_widgets
  FOR SELECT USING (is_published = true);

-- Trigger updated_at
CREATE TRIGGER set_statia_widgets_updated_at
  BEFORE UPDATE ON statia_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();