-- Table apogee_guides pour le moteur RAG
CREATE TABLE public.apogee_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  categorie text NOT NULL,
  section text NOT NULL,
  texte text NOT NULL,
  version text DEFAULT '2025-11-29',
  tags text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index pour améliorer les performances de recherche
CREATE INDEX idx_apogee_guides_categorie ON public.apogee_guides(categorie);
CREATE INDEX idx_apogee_guides_section ON public.apogee_guides(section);

-- Trigger pour updated_at automatique
CREATE TRIGGER update_apogee_guides_updated_at
  BEFORE UPDATE ON public.apogee_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS désactivé pour le moment (sera activé plus tard)
ALTER TABLE public.apogee_guides ENABLE ROW LEVEL SECURITY;

-- Politique temporaire permettant tout accès aux utilisateurs authentifiés
CREATE POLICY "Temporary full access for authenticated users"
  ON public.apogee_guides
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);