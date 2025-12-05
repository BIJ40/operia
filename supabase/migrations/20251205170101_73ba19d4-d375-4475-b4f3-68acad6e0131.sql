-- Table pour stocker les contenus de formation générés par IA
CREATE TABLE public.formation_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_block_id TEXT NOT NULL,
  source_block_title TEXT NOT NULL,
  source_category_id TEXT,
  source_category_title TEXT,
  generated_summary TEXT,
  extracted_images JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT formation_content_status_check CHECK (status IN ('pending', 'processing', 'complete', 'error'))
);

-- Index pour recherche rapide par block source
CREATE INDEX idx_formation_content_source_block ON public.formation_content(source_block_id);
CREATE INDEX idx_formation_content_category ON public.formation_content(source_category_id);
CREATE INDEX idx_formation_content_status ON public.formation_content(status);

-- Trigger pour updated_at
CREATE TRIGGER update_formation_content_updated_at
  BEFORE UPDATE ON public.formation_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.formation_content ENABLE ROW LEVEL SECURITY;

-- Policies: lecture pour tous les authentifiés, écriture pour admins N5+
CREATE POLICY "Authenticated users can view formation content"
  ON public.formation_content
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage formation content"
  ON public.formation_content
  FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));