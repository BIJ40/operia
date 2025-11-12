-- Création de la table knowledge_base pour stocker la documentation
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'manuel', 'api', 'tarifs', 'tutoriel'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX idx_knowledge_base_title ON public.knowledge_base(title);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_base_updated_at();

-- RLS: Lecture publique, écriture admin uniquement (pour l'instant pas de restrictions)
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut lire la knowledge base"
  ON public.knowledge_base
  FOR SELECT
  USING (true);

-- Commentaire
COMMENT ON TABLE public.knowledge_base IS 'Base de connaissances pour Mme Michu - Documentation Apogée et CRM';